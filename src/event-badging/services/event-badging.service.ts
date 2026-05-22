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

import { AppError } from '../../shared/errors';
import { logger } from '../../shared/logger';

@Service()
export class EventBadgingService {
  constructor(
    private githubApiService: GitHubApiService,
    private githubAppService: GitHubAppService,
    private eventRepository: EventRepository,
    private checklistService: ChecklistService,
    private scoringService: ScoringService
  ) {}

  async processWebhook(eventName: string, payload: IGitHubWebhookPayload): Promise<void> {
    if (!payload.issue?.title.match(/event/i)) {
      if (eventName === 'installation' && payload.action === 'new_permissions_accepted') {
        logger.info('New permissions accepted');
      } else if (eventName === '*') {
        logger.info(`Webhook: ${eventName}.${payload.action} not yet automated or needed`);
      }
      return;
    }

    const octokit = await this.githubAppService.getInstallationOctokit(
      payload.installation.id
    );
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
        logger.info(`Unhandled event: ${eventName}.${payload.action}`);
    }
  }

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

  private async handleCommentEvent(
    octokit: Octokit,
    payload: IGitHubWebhookPayload,
    owner: string,
    repo: string
  ): Promise<void> {
    if (payload.action !== 'created' || !payload.comment || !payload.issue) return;

    const commentBody = payload.comment.body;

    if (commentBody.match('/result')) {
      await this.handleResultCommand(octokit, payload, owner, repo);
    }

    if (commentBody.match('/end')) {
      await this.handleEndCommand(octokit, payload, owner, repo);
    }
  }

  private async handleIssueOpened(
    octokit: Octokit,
    payload: IGitHubWebhookPayload,
    owner: string,
    repo: string
  ): Promise<void> {
    if (!payload.issue) return;

    try {
      const welcomeMessage =
        await this.checklistService.getApplicantWelcome(octokit, owner, repo);

      await this.githubApiService.createIssueComment(
        octokit as any,
        owner,
        repo,
        payload.issue.number,
        welcomeMessage
      );

      logger.info('Welcome message posted');
    } catch (error) {
      logger.error('Error posting welcome message', {
        error: error instanceof Error ? error.message : error,
      });

      throw new AppError('Failed to post applicant welcome message', 500);
    }
  }

  private async handleIssueAssigned(
    octokit: Octokit,
    payload: IGitHubWebhookPayload,
    owner: string,
    repo: string
  ): Promise<void> {
    if (!payload.issue || !payload.assignee) return;

    try {
      const checklistType =
        this.checklistService.getChecklistType(payload.issue.title);

      const checklist = await this.checklistService.generateReviewerChecklist(
        octokit,
        owner,
        repo,
        payload.issue.body,
        checklistType
      );

      const reviewerWelcome =
        await this.checklistService.getReviewerWelcome(octokit, owner, repo);

      const heading = `# Checklist for @${payload.assignee.login}`;
      const reviewerMessage =
        `@${payload.assignee.login} ${reviewerWelcome}${checklist}`;

      await this.githubApiService.createIssueComment(
        octokit as any,
        owner,
        repo,
        payload.issue.number,
        `${heading}\n${reviewerMessage}`
      );

      logger.info('Checklist posted for reviewer');

      if (payload.issue.assignees.length === 2) {
        await this.githubApiService.addLabels(
          octokit as any,
          owner,
          repo,
          payload.issue.number,
          ['review-begin']
        );

        logger.info('review-begin label added');
      }
    } catch (error) {
      logger.error('Error assigning checklist', {
        error: error instanceof Error ? error.message : error,
      });

      throw new AppError('Failed to assign reviewer checklist', 500);
    }
  }

  private async handleIssueClosed(
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

      const eventName = payload.issue.title.replace(/\[(.*?)\] /gi, '');

      let eventUrl = '';

      const body = payload.issue.body || '';
      const match = body.match(/Link to the Event Website:\s*(.+)$/mi);

      logger.info(`Regex match result: ${JSON.stringify(match)}`);

      if (match) {
        eventUrl = match[1];
      }

      const badge: IEventBadge = {
        name: badgeResult.assigned_badge,
        badgeURL: badgeResult.badge_URL,
      };

      const reviewers: IEventReviewer[] = payload.issue.assignees.map((a) => ({
        name: a.login,
        github_profile_link: a.html_url,
      }));

      const application: IEventApplication = {
        app_no: payload.issue.number,
        app_URL: payload.issue.html_url,
      };

      await this.eventRepository.createEvent({
        event_name: eventName,
        event_URL: eventUrl,
        badge,
        reviewers,
        application,
      });

      logger.info('Event saved to database', { eventUrl });
    } catch (error) {
      logger.error('Error saving event', {
        error: error instanceof Error ? error.message : error,
      });

      throw new AppError('Failed to persist event after closure', 500);
    }
  }

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
        octokit as any,
        owner,
        repo,
        payload.issue.number,
        message
      );

      logger.info('Results posted');
    } catch (error) {
      logger.error('Error posting results', {
        error: error instanceof Error ? error.message : error,
      });

      throw new AppError('Failed to post review results', 500);
    }
  }

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

      await this.githubApiService.removeLabel(
        octokit as any,
        owner,
        repo,
        payload.issue.number,
        'review-begin'
      );

      await this.githubApiService.addLabels(
        octokit as any,
        owner,
        repo,
        payload.issue.number,
        ['review-end']
      );

      await this.githubApiService.createIssueComment(
        octokit as any,
        owner,
        repo,
        payload.issue.number,
        `${badgeResult.markdownBadgeImage}${message}`
      );

      await this.githubApiService.closeIssue(
        octokit as any,
        owner,
        repo,
        payload.issue.number
      );

      logger.info('Review ended and issue closed');
    } catch (error) {
      logger.error('Error ending review', {
        error: error instanceof Error ? error.message : error,
      });

      throw new AppError('Failed to complete review end flow', 500);
    }
  }
}






