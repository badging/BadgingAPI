import { Service } from 'typedi';
import { Octokit } from '@octokit/rest';
import { GitHubApiService, GitLabApiService, RepoRepository } from '../../shared';
import { DEIScannerService, ILocalDEIScanResult } from './dei-scanner.service';
import { BadgeAwardService } from './badge-award.service';
import { Provider } from '../../shared/types';

export interface IScanResult {
  repoUrl: string;
  success: boolean;
  message: string;
}

@Service()
export class ProjectBadgingService {
  constructor(
    private githubApiService: GitHubApiService,
    private gitlabApiService: GitLabApiService,
    private repoRepository: RepoRepository,
    private deiScannerService: DEIScannerService,
    private badgeAwardService: BadgeAwardService
  ) {}

  /**
   * Scan repositories and award badges
   */
  async scanRepositories(
    userId: number,
    userName: string,
    email: string,
    repositoryIds: number[],
    provider: Provider
  ): Promise<IScanResult[]> {
    const results: IScanResult[] = [];

    // Get DEI template for comparison
    const template = await this.deiScannerService.getDEITemplate();

    for (const repoId of repositoryIds) {
      if (provider === 'github') {
        const result = await this.scanGitHubRepository(userId, userName, email, repoId, template);
        results.push(result);
      } else if (provider === 'gitlab') {
        const result = await this.scanGitLabRepository(userId, userName, email, repoId, template);
        results.push(result);
      }
    }

    // Send error notification for repositories that couldn't be badged
    const errorResults = results.filter((r) => !r.success);
    if (errorResults.length > 0) {
      await this.badgeAwardService.sendErrorNotification(
        email,
        userName,
        errorResults.map((r) => r.message)
      );
    }

    return results;
  }

  /**
   * Scan a single GitHub repository
   */
  private async scanGitHubRepository(
    userId: number,
    userName: string,
    email: string,
    repositoryId: number,
    template: string | null
  ): Promise<IScanResult> {
    const octokit = new Octokit();

    // Get repository info
    const { data: repoInfo, errors: infoErrors } = await this.githubApiService.getRepositoryInfo(
      octokit,
      repositoryId
    );

    if (infoErrors.length > 0 || !repoInfo) {
      return {
        repoUrl: `Repository ID: ${repositoryId}`,
        success: false,
        message: infoErrors.join(', ') || 'Failed to get repository info',
      };
    }

    // Get DEI.md file
    const { data: file, errors: fileErrors } = await this.githubApiService.getFileContentAndSHA(
      octokit,
      repoInfo.fullName!,
      'DEI.md'
    );

    if (fileErrors.length > 0 || !file) {
      return {
        repoUrl: repoInfo.url,
        success: false,
        message: `${repoInfo.url} does not have a DEI.md file`,
      };
    }

    return this.processRepository(
      userId,
      userName,
      email,
      repoInfo.id,
      null,
      repoInfo.url,
      file.content,
      file.sha,
      template,
      'github'
    );
  }

  /**
   * Scan a single GitLab repository
   */
  private async scanGitLabRepository(
    userId: number,
    userName: string,
    email: string,
    repositoryId: number,
    template: string | null
  ): Promise<IScanResult> {
    // Get repository info
    const { data: repoInfo, errors: infoErrors } =
      await this.gitlabApiService.getRepositoryInfo(repositoryId);

    if (infoErrors.length > 0 || !repoInfo) {
      return {
        repoUrl: `Repository ID: ${repositoryId}`,
        success: false,
        message: infoErrors.join(', ') || 'Failed to get repository info',
      };
    }

    // Get DEI.md file
    const { data: file, errors: fileErrors } = await this.gitlabApiService.getFileContentAndSHA(
      repositoryId,
      'DEI.md',
      repoInfo.defaultBranch!
    );

    if (fileErrors.length > 0 || !file) {
      return {
        repoUrl: repoInfo.url,
        success: false,
        message: `${repoInfo.url} does not have a DEI.md file`,
      };
    }

    return this.processRepository(
      userId,
      userName,
      email,
      null,
      repoInfo.id,
      repoInfo.url,
      file.content,
      file.sha,
      template,
      'gitlab'
    );
  }

  /**
   * Process a repository for badging
   */
  private async processRepository(
    userId: number,
    userName: string,
    email: string,
    githubRepoId: number | null,
    gitlabRepoId: number | null,
    repoUrl: string,
    deiContent: string,
    deiCommitSHA: string,
    template: string | null,
    _provider: Provider
  ): Promise<IScanResult> {
    try {
      // Check if already badged with same SHA
      let existingRepo = null;
      if (githubRepoId) {
        existingRepo = await this.repoRepository.findByGithubRepoAndSHA(githubRepoId, deiCommitSHA);
      } else if (gitlabRepoId) {
        existingRepo = await this.repoRepository.findByGitlabRepoAndSHA(gitlabRepoId, deiCommitSHA);
      }

      if (existingRepo) {
        return {
          repoUrl,
          success: false,
          message: `${repoUrl} was already badged`,
        };
      }

      // Check if content is just the template
      if (template && this.deiScannerService.isTemplateContent(deiContent, template)) {
        return {
          repoUrl,
          success: false,
          message: `Please provide DEI information specific to ${repoUrl} by editing the template`,
        };
      }

      // Scan DEI content for required sections
      const scanResult: ILocalDEIScanResult = this.deiScannerService.scanDEIContent(deiContent);

      if (!scanResult.isValid) {
        // Send failure notification with missing sections
        await this.badgeAwardService.sendFailureNotification(
          email,
          userName,
          scanResult.missingSections
        );

        return {
          repoUrl,
          success: false,
          message: `Missing sections: ${scanResult.missingSections.join(', ')}`,
        };
      }

      // Award badge
      const badgeAwarded = await this.badgeAwardService.awardBronzeBadge(
        userId,
        userName,
        email,
        githubRepoId,
        gitlabRepoId,
        repoUrl,
        deiCommitSHA
      );

      return {
        repoUrl,
        success: badgeAwarded,
        message: badgeAwarded ? 'Badge awarded successfully' : 'Failed to award badge',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        repoUrl,
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Get all badged repositories
   */
  async getBadgedRepos(): Promise<
    Array<{
      id: number;
      githubRepoId: number | null;
      gitlabRepoId?: number | null;
      repoLink: string;
      badgeType: string;
      attachment: string;
      createdAt: Date;
      updatedAt: Date;
      userId: number;
    }>
  > {
    const repos = await this.repoRepository.getAllBadgedRepos();
    return repos.map((repo) => ({
      id: repo.id,
      githubRepoId: repo.githubRepoId,
      gitlabRepoId: repo.gitlabRepoId,
      repoLink: repo.repoLink,
      badgeType: repo.badgeType,
      attachment: repo.attachment,
      createdAt: repo.createdAt,
      updatedAt: repo.updatedAt,
      userId: repo.userId,
    }));
  }
}
