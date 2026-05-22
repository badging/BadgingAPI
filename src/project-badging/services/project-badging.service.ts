import { Service } from 'typedi';
import { Octokit } from '@octokit/rest';
import { GitHubApiService, GitLabApiService, RepoRepository } from '../../shared';
import { DEIScannerService, ILocalDEIScanResult } from './dei-scanner.service';
import { BadgeAwardService } from './badge-award.service';
import { Provider } from '../../shared/types';
import { AppError } from '../../shared/errors';

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

  async scanRepositories(
    userId: number,
    userName: string,
    email: string,
    repositoryIds: number[],
    provider: Provider
  ): Promise<IScanResult[]> {
    const results: IScanResult[] = [];

    const template = await this.deiScannerService.getDEITemplate();

    for (const repoId of repositoryIds) {
      try {
        if (provider === 'github') {
          const result = await this.scanGitHubRepository(
            userId,
            userName,
            email,
            repoId,
            template
          );

          results.push(result);
        } else if (provider === 'gitlab') {
          const result = await this.scanGitLabRepository(
            userId,
            userName,
            email,
            repoId,
            template
          );

          results.push(result);
        }
      } catch (error) {
        results.push({
          repoUrl: `Repository ID: ${repoId}`,
          success: false,
          message:
            error instanceof AppError
              ? error.message
              : 'Unexpected error scanning repository',
        });
      }
    }

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

  private async scanGitHubRepository(
    userId: number,
    userName: string,
    email: string,
    repositoryId: number,
    template: string | null
  ): Promise<IScanResult> {
    const octokit = new Octokit();

    const { data: repoInfo, errors: infoErrors } =
      await this.githubApiService.getRepositoryInfo(octokit, repositoryId);

    if (infoErrors.length > 0 || !repoInfo) {
      throw new AppError(
        infoErrors.join(', ') || 'Failed to get repository info',
        404
      );
    }

    const { data: file, errors: fileErrors } =
      await this.githubApiService.getFileContentAndSHA(
        octokit,
        repoInfo.fullName!,
        'DEI.md'
      );

    if (fileErrors.length > 0 || !file) {
      throw new AppError(
        `${repoInfo.url} does not have a DEI.md file`,
        400
      );
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

  private async scanGitLabRepository(
    userId: number,
    userName: string,
    email: string,
    repositoryId: number,
    template: string | null
  ): Promise<IScanResult> {
    const { data: repoInfo, errors: infoErrors } =
      await this.gitlabApiService.getRepositoryInfo(repositoryId);

    if (infoErrors.length > 0 || !repoInfo) {
      throw new AppError(
        infoErrors.join(', ') || 'Failed to get repository info',
        404
      );
    }

    const { data: file, errors: fileErrors } =
      await this.gitlabApiService.getFileContentAndSHA(
        repositoryId,
        'DEI.md',
        repoInfo.defaultBranch!
      );

    if (fileErrors.length > 0 || !file) {
      throw new AppError(
        `${repoInfo.url} does not have a DEI.md file`,
        400
      );
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
    let existingRepo = null;

    if (githubRepoId) {
      existingRepo = await this.repoRepository.findByGithubRepoAndSHA(
        githubRepoId,
        deiCommitSHA
      );
    } else if (gitlabRepoId) {
      existingRepo = await this.repoRepository.findByGitlabRepoAndSHA(
        gitlabRepoId,
        deiCommitSHA
      );
    }

    if (existingRepo) {
      throw new AppError(`${repoUrl} was already badged`, 409);
    }

    if (
      template &&
      this.deiScannerService.isTemplateContent(deiContent, template)
    ) {
      throw new AppError(
        `Please provide DEI information specific to ${repoUrl} by editing the template`,
        400
      );
    }

    const scanResult: ILocalDEIScanResult =
      this.deiScannerService.scanDEIContent(deiContent);

    if (!scanResult.isValid) {
      await this.badgeAwardService.sendFailureNotification(
        email,
        userName,
        scanResult.missingSections
      );

      throw new AppError(
        `Missing sections: ${scanResult.missingSections.join(', ')}`,
        400
      );
    }

    const badgeAwarded = await this.badgeAwardService.awardBronzeBadge(
      userId,
      userName,
      email,
      githubRepoId,
      gitlabRepoId,
      repoUrl,
      deiCommitSHA
    );

    if (!badgeAwarded) {
      throw new AppError('Failed to award badge', 500);
    }

    return {
      repoUrl,
      success: true,
      message: 'Badge awarded successfully',
    };
  }

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