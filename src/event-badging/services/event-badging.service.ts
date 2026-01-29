import { Service } from 'typedi';
import { Octokit } from 'octokit';
import { GitHubApiService } from '../../shared/providers/github/github-api.service';
import { GitHubAppService } from '../../shared/providers/github/github-app.service';
import { EventRepository } from '../../shared/data-access/repositories/event.repository';
import { ChecklistService } from './checklist.service';
import { ScoringService } from './scoring.service';
import {
  IGitHubWebhookPayload,
  IEventBadge,
  IEventReviewer,
  IEventApplication,
} from '../../shared/types';

@Service()
export class EventBadgingService {
  constructor(
    private githubApiService: GitHubApiService,
    private githubAppService: GitHubAppService,
    private eventRepository: EventRepository,
    private checklistService: ChecklistService,
    private scoringService: ScoringService
  ) {}

  /**
   * Process incoming webhook event
   */
  async processWebhook(eventName: string, payload: IGitHubWebhookPayload): Promise<void> {
    // Only process events related to event badging issues
    if (!payload.issue?.title.match(/event/i)) {
      // Handle non-event related webhooks
      if (eventName === 'installation' && payload.action === 'new_permissions_accepted') {
        console.info('New permissions accepted');
      } else if (eventName === '*') {
        console.info(`Webhook: ${eventName}.${payload.action} not yet automated or needed`);
      }
      return;
    }

    const octokit = await this.githubAppService.getInstallationOctokit(payload.installation.id);
    const owner = payload.repository.owner.login;
    const repo = payload.repository.name;

    switch (eventName) {
      case 'issues':
        await this.handleIssueEvent(octokit, payload, owner, repo);
        break;
      case 'issue_comment':
        await this.handleCommentEvent(octokit, payload, owner, repo);
        break;
      default:
        console.info(`Unhandled event: ${eventName}.${payload.action}`);
    }
  }

  /**
   * Handle issue events (opened, assigned, closed)
   */
  private async handleIssueEvent(
    octokit: Octokit,
    payload: IGitHubWebhookPayload,
    owner: string,
    repo: string
  ): Promise<void> {
    if (!payload.issue) return;

    switch (payload.action) {
      case 'opened':
        await this.handleIssueOpened(octokit, payload, owner, repo);
        break;
      case 'assigned':
        await this.handleIssueAssigned(octokit, payload, owner, repo);
        break;
      case 'closed':
        await this.handleIssueClosed(octokit, payload, owner, repo);
        break;
    }
  }

  /**
   * Handle comment events
   */
  private async handleCommentEvent(
    octokit: Octokit,
    payload: IGitHubWebhookPayload,
    owner: string,
    repo: string
  ): Promise<void> {
    if (payload.action !== 'created' || !payload.comment || !payload.issue) return;

    const commentBody = payload.comment.body;

    // Handle /result command
    if (commentBody.match('/result')) {
      await this.handleResultCommand(octokit, payload, owner, repo);
    }

    // Handle /end command
    if (commentBody.match('/end')) {
      await this.handleEndCommand(octokit, payload, owner, repo);
    }
  }

  /**
   * Welcome applicant when issue is opened
   */
  private async handleIssueOpened(
    octokit: Octokit,
    payload: IGitHubWebhookPayload,
    owner: string,
    repo: string
  ): Promise<void> {
    if (!payload.issue) return;

    try {
      const welcomeMessage = await this.checklistService.getApplicantWelcome(octokit, owner, repo);

      await this.githubApiService.createIssueComment(
        octokit as unknown as import('@octokit/rest').Octokit,
        owner,
        repo,
        payload.issue.number,
        welcomeMessage
      );
      console.info('Welcome message posted');
    } catch (error) {
      console.error('Error posting welcome message:', error);
    }
  }

  /**
   * Assign checklist when reviewer is assigned
   */
  private async handleIssueAssigned(
    octokit: Octokit,
    payload: IGitHubWebhookPayload,
    owner: string,
    repo: string
  ): Promise<void> {
    if (!payload.issue || !payload.assignee) return;

    try {
      // Determine checklist type
      const checklistType = this.checklistService.getChecklistType(payload.issue.title);

      // Generate checklist
      const checklist = await this.checklistService.generateReviewerChecklist(
        octokit,
        owner,
        repo,
        payload.issue.body,
        checklistType
      );

      // Get reviewer welcome message
      const reviewerWelcome = await this.checklistService.getReviewerWelcome(octokit, owner, repo);

      // Create heading and message
      const heading = `# Checklist for @${payload.assignee.login}`;
      const reviewerMessage = `@${payload.assignee.login} ${reviewerWelcome}${checklist}`;

      // Post checklist comment
      await this.githubApiService.createIssueComment(
        octokit as unknown as import('@octokit/rest').Octokit,
        owner,
        repo,
        payload.issue.number,
        `${heading}\n${reviewerMessage}`
      );
      console.info('Checklist posted for reviewer');

      // Add review-begin label if two reviewers are assigned
      if (payload.issue.assignees.length === 2) {
        await this.githubApiService.addLabels(
          octokit as unknown as import('@octokit/rest').Octokit,
          owner,
          repo,
          payload.issue.number,
          ['review-begin']
        );
        console.info('review-begin label added');
      }
    } catch (error) {
      console.error('Error assigning checklist:', error);
    }
  }

  /**
   * Save event when issue is closed
   */
  private async handleIssueClosed(
    octokit: Octokit,
    payload: IGitHubWebhookPayload,
    owner: string,
    repo: string
  ): Promise<void> {
    if (!payload.issue) return;

    try {
      // Calculate badge
      const badgeResult = await this.scoringService.calculateBadge(
        octokit,
        owner,
        repo,
        payload.issue.number,
        payload.issue.html_url,
        repo
      );

      // Extract event name from title
      const eventName = payload.issue.title.replace(/\[(.*?)\] /gi, '');

      // Extract event URL from body
      let eventUrl = '';
      if (payload.issue.title.includes('[Virtual Event]')) {
        const startMarker = '- Link to the Event Website: ';
        const endMarker = '- Provide verification that you are an event organizer: ';
        const startIdx = payload.issue.body.indexOf(startMarker);
        const endIdx = payload.issue.body.indexOf(endMarker);
        if (startIdx !== -1 && endIdx !== -1) {
          eventUrl = payload.issue.body.slice(startIdx, endIdx - 2).replace(startMarker, '');
        }
      } else if (payload.issue.title.includes('[In-Person Event]')) {
        const startMarker = '- Link to the Event Website: ';
        const endMarker = '- Are you an organizer ';
        const startIdx = payload.issue.body.indexOf(startMarker);
        const endIdx = payload.issue.body.indexOf(endMarker);
        if (startIdx !== -1 && endIdx !== -1) {
          eventUrl = payload.issue.body.slice(startIdx, endIdx - 2).replace(startMarker, '');
        }
      }

      // Create badge object
      const badge: IEventBadge = {
        name: badgeResult.assigned_badge,
        badgeURL: badgeResult.badge_URL,
      };

      // Create reviewers array
      const reviewers: IEventReviewer[] = payload.issue.assignees.map((assignee) => ({
        name: assignee.login,
        github_profile_link: assignee.html_url,
      }));

      // Create application object
      const application: IEventApplication = {
        app_no: payload.issue.number,
        app_URL: payload.issue.html_url,
      };

      // Save event to database
      await this.eventRepository.createEvent({
        event_name: eventName,
        event_URL: eventUrl,
        badge,
        reviewers,
        application,
      });

      console.info('Event saved to database');
    } catch (error) {
      console.error('Error saving event:', error);
    }
  }

  /**
   * Handle /result command - post review results
   */
  private async handleResultCommand(
    octokit: Octokit,
    payload: IGitHubWebhookPayload,
    owner: string,
    repo: string
  ): Promise<void> {
    if (!payload.issue) return;

    try {
      const badgeResult = await this.scoringService.calculateBadge(
        octokit,
        owner,
        repo,
        payload.issue.number,
        payload.issue.html_url,
        repo
      );

      const message =
        `\nReview percentage: ${badgeResult.reviewResult}\n` +
        `\nNumber of reviewers: ${badgeResult.reviewerCount}\n`;

      await this.githubApiService.createIssueComment(
        octokit as unknown as import('@octokit/rest').Octokit,
        owner,
        repo,
        payload.issue.number,
        message
      );
      console.info('Results posted');
    } catch (error) {
      console.error('Error posting results:', error);
    }
  }

  /**
   * Handle /end command - end review and assign badge
   */
  private async handleEndCommand(
    octokit: Octokit,
    payload: IGitHubWebhookPayload,
    owner: string,
    repo: string
  ): Promise<void> {
    if (!payload.issue) return;

    try {
      const badgeResult = await this.scoringService.calculateBadge(
        octokit,
        owner,
        repo,
        payload.issue.number,
        payload.issue.html_url,
        repo
      );

      const message =
        `\n**Markdown Badge Link:**\n\`\`\`\n${badgeResult.markdownBadgeImage}\n\`\`\`` +
        `\n**HTML Badge Link:**\n\`\`\`\n${badgeResult.htmlBadgeImage}\n\`\`\``;

      // Remove review-begin label
      await this.githubApiService.removeLabel(
        octokit as unknown as import('@octokit/rest').Octokit,
        owner,
        repo,
        payload.issue.number,
        'review-begin'
      );

      // Add review-end label
      await this.githubApiService.addLabels(
        octokit as unknown as import('@octokit/rest').Octokit,
        owner,
        repo,
        payload.issue.number,
        ['review-end']
      );

      // Post badge comment
      await this.githubApiService.createIssueComment(
        octokit as unknown as import('@octokit/rest').Octokit,
        owner,
        repo,
        payload.issue.number,
        `${badgeResult.markdownBadgeImage}${message}`
      );

      // Close issue
      await this.githubApiService.closeIssue(
        octokit as unknown as import('@octokit/rest').Octokit,
        owner,
        repo,
        payload.issue.number
      );

      console.info('Review ended and issue closed');
    } catch (error) {
      console.error('Error ending review:', error);
    }
  }
}
