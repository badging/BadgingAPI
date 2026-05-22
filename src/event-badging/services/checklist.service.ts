import { Service } from 'typedi';
import { Octokit } from 'octokit';
import { GitHubApiService } from '../../shared/providers/github/github-api.service';
import { AppError } from '../../shared/errors';
import { logger } from '../../shared/logger';

type ChecklistType = 'virtual' | 'in-person';

interface ChecklistSection {
  issueHeader: string;
  checklistHeader: string;
  nextIssueHeader: string;
  nextChecklistHeader: string;
}

@Service()
export class ChecklistService {
  constructor(private githubApiService: GitHubApiService) {}

  getChecklistType(issueTitle: string): ChecklistType {
    if (issueTitle.substring(0, 15) === '[Virtual Event]') {
      return 'virtual';
    }
    return 'in-person';
  }

  getChecklistPath(type: ChecklistType): string {
    return type === 'virtual'
      ? '.github/checklist-virtual.md'
      : '.github/checklist.md';
  }

  async generateReviewerChecklist(
    octokit: Octokit,
    owner: string,
    repo: string,
    issueBody: string,
    checklistType: ChecklistType
  ): Promise<string> {
    const checklistPath = this.getChecklistPath(checklistType);

    const { data: checklistContent, errors } =
      await this.githubApiService.getRepoContent(
        octokit as unknown as import('@octokit/rest').Octokit,
        owner,
        repo,
        checklistPath
      );

    if (errors.length > 0 || !checklistContent) {
      logger.error('Failed to fetch checklist', { errors });
      throw new AppError('Failed to fetch checklist template', 500);
    }

    const cleanedBody = issueBody.replace(/- \[x\]|- \[ \]/g, '');

    return checklistType === 'virtual'
      ? this.combineVirtualChecklist(cleanedBody, checklistContent)
      : this.combineInPersonChecklist(cleanedBody, checklistContent);
  }

  private combineVirtualChecklist(issueBody: string, checklist: string): string {
    const sections: ChecklistSection[] = [
      {
        issueHeader: '## Event Demographics',
        checklistHeader: '### Event Demographics',
        nextIssueHeader: '## Inclusive Experience at Event',
        nextChecklistHeader: '### Inclusive Experience at Event',
      },
      {
        issueHeader: '## Inclusive Experience at Event',
        checklistHeader: '### Inclusive Experience at Event',
        nextIssueHeader: '## Time Inclusion for Virtual Events',
        nextChecklistHeader: '### Time Inclusion for Virtual Events',
      },
      {
        issueHeader: '## Time Inclusion for Virtual Events',
        checklistHeader: '### Time Inclusion for Virtual Events',
        nextIssueHeader: '## Code of Conduct at Event',
        nextChecklistHeader: '### Code of Conduct at Event',
      },
      {
        issueHeader: '## Code of Conduct at Event',
        checklistHeader: '### Code of Conduct at Event',
        nextIssueHeader: '## Diversity Access Tickets',
        nextChecklistHeader: '### Diversity Access tickets',
      },
      {
        issueHeader: '## Diversity Access Tickets',
        checklistHeader: '### Diversity Access tickets',
        nextIssueHeader: '## Event Accessibility',
        nextChecklistHeader: '### Event Accessibility',
      },
    ];

    let combined = '';

    combined +=
      issueBody.slice(0, issueBody.indexOf('## Event Demographics')) +
      '\n' +
      checklist.slice(
        checklist.indexOf('## Initial checks'),
        checklist.indexOf('## Metric based checks')
      ) +
      '\n\n';

    for (const section of sections) {
      combined +=
        issueBody.slice(
          issueBody.indexOf(section.issueHeader),
          issueBody.indexOf(section.nextIssueHeader)
        ) +
        '\n' +
        checklist.slice(
          checklist.indexOf(section.checklistHeader),
          checklist.indexOf(section.nextChecklistHeader)
        ) +
        '\n\n';
    }

    combined +=
      issueBody.slice(issueBody.indexOf('## Event Accessibility')) +
      '\n' +
      checklist.slice(checklist.indexOf('### Event Accessibility')) +
      '\n';

    return combined;
  }

  private combineInPersonChecklist(issueBody: string, checklist: string): string {
    const sections: ChecklistSection[] = [
      {
        issueHeader: '## Event Demographics',
        checklistHeader: '### Event Demographics',
        nextIssueHeader: '## Inclusive Experience at Event',
        nextChecklistHeader: '### Inclusive Experience at Event',
      },
      {
        issueHeader: '## Inclusive Experience at Event',
        checklistHeader: '### Inclusive Experience at Event',
        nextIssueHeader: '## Code of Conduct at Event',
        nextChecklistHeader: '### Code of Conduct at Event',
      },
      {
        issueHeader: '## Code of Conduct at Event',
        checklistHeader: '### Code of Conduct at Event',
        nextIssueHeader: '## Diversity Access Tickets',
        nextChecklistHeader: '### Diversity Access tickets',
      },
      {
        issueHeader: '## Diversity Access Tickets',
        checklistHeader: '### Diversity Access tickets',
        nextIssueHeader: '## Family Friendliness',
        nextChecklistHeader: '### Family Friendliness',
      },
      {
        issueHeader: '## Family Friendliness',
        checklistHeader: '### Family Friendliness',
        nextIssueHeader: '## Event Accessibility',
        nextChecklistHeader: '### Event Accessibility',
      },
      {
        issueHeader: '## Event Accessibility',
        checklistHeader: '### Event Accessibility',
        nextIssueHeader: '## Event Location Inclusivity',
        nextChecklistHeader: '### Event Location Inclusivity',
      },
      {
        issueHeader: '## Event Location Inclusivity',
        checklistHeader: '### Event Location Inclusivity',
        nextIssueHeader: '## Public Health and Safety',
        nextChecklistHeader: '### Public Health and Safety',
      },
    ];

    let combined = '';

    combined +=
      issueBody.slice(0, issueBody.indexOf('## Event Demographics')) +
      '\n' +
      checklist.slice(
        checklist.indexOf('## Initial checks'),
        checklist.indexOf('## Metric based checks')
      ) +
      '\n\n';

    for (const section of sections) {
      combined +=
        issueBody.slice(
          issueBody.indexOf(section.issueHeader),
          issueBody.indexOf(section.nextIssueHeader)
        ) +
        '\n' +
        checklist.slice(
          checklist.indexOf(section.checklistHeader),
          checklist.indexOf(section.nextChecklistHeader)
        ) +
        '\n\n';
    }

    combined +=
      issueBody.slice(issueBody.indexOf('## Public Health and Safety')) +
      '\n' +
      checklist.slice(checklist.indexOf('### Public Health and Safety')) +
      '\n';

    return combined;
  }

  async getReviewerWelcome(octokit: Octokit, owner: string, repo: string): Promise<string> {
    const { data: content, errors } =
      await this.githubApiService.getRepoContent(
        octokit as unknown as import('@octokit/rest').Octokit,
        owner,
        repo,
        '.github/reviewer-welcome.md'
      );

    if (errors.length > 0 || !content) {
      logger.error('Failed to fetch reviewer welcome', { errors });
      throw new AppError('Failed to fetch reviewer welcome message', 500);
    }

    return content;
  }

  async getApplicantWelcome(octokit: Octokit, owner: string, repo: string): Promise<string> {
    const { data: content, errors } =
      await this.githubApiService.getRepoContent(
        octokit as unknown as import('@octokit/rest').Octokit,
        owner,
        repo,
        '.github/applicant-welcome.md'
      );

    if (errors.length > 0 || !content) {
      logger.error('Failed to fetch applicant welcome', { errors });
      throw new AppError('Failed to fetch applicant welcome message', 500);
    }

    return content;
  }

  async checkModerator(
    octokit: Octokit,
    owner: string,
    repo: string,
    username: string
  ): Promise<boolean> {
    try {
      const { data: moderatorsContent, errors } =
        await this.githubApiService.getRepoContent(
          octokit as unknown as import('@octokit/rest').Octokit,
          owner,
          repo,
          '.github/moderators.md'
        );

      if (errors.length > 0 || !moderatorsContent) {
        logger.warn('Failed to fetch moderators list', { errors });
        return false;
      }

      const moderatorList = moderatorsContent
        .split('\n')
        .filter((line) => line.startsWith('- '))
        .map((line) => line.substring(2).trim());

      return moderatorList.includes(username);
    } catch (error) {
      logger.error('Error checking moderator status', {
        error: error instanceof Error ? error.message : error,
      });
      return false;
    }
  }
}