import { Service } from 'typedi';
import { Octokit } from 'octokit';
import { GitHubApiService } from '../../shared/providers/github/github-api.service';
import { BadgeLevel, IBadgeCalculationResult } from '../../shared/types';

@Service()
export class ScoringService {
  constructor(private githubApiService: GitHubApiService) {}

  /**
   * Calculate badge based on reviewer checklists
   */
  async calculateBadge(
    octokit: Octokit,
    owner: string,
    repo: string,
    issueNumber: number,
    issueUrl: string,
    repoName: string
  ): Promise<IBadgeCalculationResult> {
    // Determine initial check count based on repository
    let initialCheckCount = 6;
    if (repoName === 'event-diversity-and-inclusion') {
      initialCheckCount = 4;
    }

    // Get all comments on the issue
    const { data: comments, errors } = await this.githubApiService.listIssueComments(
      octokit as unknown as import('@octokit/rest').Octokit,
      owner,
      repo,
      issueNumber
    );

    if (errors.length > 0 || !comments) {
      throw new Error(`Failed to get comments: ${errors.join(', ')}`);
    }

    // Filter comments that are checklists (from bots, starting with "# Checklist for")
    const checklists = comments.filter(
      (comment) =>
        comment.user.type === 'Bot' && comment.body.substring(0, 15) === '# Checklist for'
    );

    if (checklists.length === 0) {
      return this.createBadgeResult(0, 0, issueUrl);
    }

    // Calculate total check count for each checklist
    const totalCheckCounts = checklists.map((checklist) => {
      const checked = (checklist.body.match(/\[x\]/g) || []).length;
      const unchecked = (checklist.body.match(/\[ \]/g) || []).length;
      return checked + unchecked - initialCheckCount;
    });

    // Calculate positive check count for each checklist
    const positiveCheckCounts = checklists.map((checklist) => {
      const checked = (checklist.body.match(/\[x\]/g) || []).length - initialCheckCount;
      return checked <= 0 ? 0 : checked;
    });

    // Calculate percentages
    const percentages = positiveCheckCounts.map((positive, index) => {
      const total = totalCheckCounts[index];
      if (total <= 0) return 0;
      return Math.floor((positive / total) * 100);
    });

    // Calculate average review result
    const reviewerCount = percentages.length;
    const reviewResult =
      percentages.reduce((sum, percentage) => sum + percentage, 0) / reviewerCount;

    return this.createBadgeResult(reviewResult, reviewerCount, issueUrl);
  }

  /**
   * Create badge result based on review percentage
   */
  private createBadgeResult(
    reviewResult: number,
    reviewerCount: number,
    issueUrl: string
  ): IBadgeCalculationResult {
    // Determine badge level
    let badgeLevel: BadgeLevel;
    let badgeCode: string;

    if (reviewResult < 40) {
      badgeLevel = 'Pending';
      badgeCode = 'D%26I-Pending-red';
    } else if (reviewResult < 60) {
      badgeLevel = 'Passing';
      badgeCode = 'D%26I-Passing-passing';
    } else if (reviewResult < 80) {
      badgeLevel = 'Silver';
      badgeCode = 'D%26I-Silver-silver';
    } else if (reviewResult <= 100) {
      badgeLevel = 'Gold';
      badgeCode = 'D%26I-Gold-yellow';
    } else {
      badgeLevel = 'Pending';
      badgeCode = 'D%26I-Pending-red';
    }

    // Build badge URL with CHAOSS logo
    const logoBase64 =
      'PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmlld0JveD0iMCAwIDI1MCAyNTAiPgo8cGF0aCBmaWxsPSIjMUM5QkQ2IiBkPSJNOTcuMSw0OS4zYzE4LTYuNywzNy44LTYuOCw1NS45LTAuMmwxNy41LTMwLjJjLTI5LTEyLjMtNjEuOC0xMi4yLTkwLjgsMC4zTDk3LjEsNDkuM3oiLz4KPHBhdGggZmlsbD0iIzZBQzdCOSIgZD0iTTE5NC42LDMyLjhMMTc3LjIsNjNjMTQuOCwxMi4zLDI0LjcsMjkuNSwyNy45LDQ4LjVoMzQuOUMyMzYuMiw4MC4yLDIxOS45LDUxLjcsMTk0LjYsMzIuOHoiLz4KPHBhdGggZmlsbD0iI0JGOUNDOSIgZD0iTTIwNC45LDEzOS40Yy03LjksNDMuOS00OS45LDczLTkzLjgsNjUuMWMtMTMuOC0yLjUtMjYuOC04LjYtMzcuNS0xNy42bC0yNi44LDIyLjQKCWM0Ni42LDQzLjQsMTE5LjUsNDAuOSwxNjIuOS01LjdjMTYuNS0xNy43LDI3LTQwLjIsMzAuMS02NC4ySDIwNC45eiIvPgo8cGF0aCBmaWxsPSIjRDYxRDVGIiBkPSJNNTUuNiwxNjUuNkMzNS45LDEzMS44LDQzLjMsODguOCw3My4xLDYzLjVMNTUuNywzMy4yQzcuNSw2OS44LTQuMiwxMzcuNCwyOC44LDE4OEw1NS42LDE2NS42eiIvPgo8L3N2Zz4K';

    const badgeUrl =
      `https://img.shields.io/badge/${badgeCode}?style=flat-square&labelColor=583586` +
      `&&link=${issueUrl}/&logo=data:image/svg+xml;base64,${logoBase64}`;

    const markdownBadgeImage = `![Assigned badge: ${badgeLevel}](${badgeUrl})`;
    const htmlBadgeImage = `<img src='${badgeUrl}' alt='d&i-badging-badge-state: ${badgeLevel}'/>`;

    return {
      markdownBadgeImage,
      htmlBadgeImage,
      reviewResult,
      reviewerCount,
      assigned_badge: badgeLevel,
      badge_URL: badgeUrl,
    };
  }
}
