import { Service } from 'typedi';
import { Repo } from '../models/repo.model';
import { User } from '../models/user.model';
import { IRepoCreationAttributes } from '../../types';
import { logger } from '../../logger'

@Service()
export class RepoRepository {
  /**
   * Find a repo by its internal ID
   */
  async findById(repoId: number): Promise<Repo | null> {
    return Repo.findByPk(repoId);
  }

  /**
   * Find a repo by GitHub repo ID and DEI commit SHA
   */
  async findByGithubRepoAndSHA(githubRepoId: number, DEICommitSHA: string): Promise<Repo | null> {
    return Repo.findOne({
      where: { githubRepoId, DEICommitSHA },
    });
  }

  /**
   * Find a repo by GitLab repo ID and DEI commit SHA
   */
  async findByGitlabRepoAndSHA(gitlabRepoId: number, DEICommitSHA: string): Promise<Repo | null> {
    return Repo.findOne({
      where: { gitlabRepoId, DEICommitSHA },
    });
  }

  /**
   * Find all repos
   */
  async findAll(excludeFields: string[] = []): Promise<Repo[]> {
    return Repo.findAll({
      attributes: { exclude: excludeFields },
    });
  }

  /**
   * Find all repos for a user
   */
  async findByUserId(userId: number): Promise<Repo[]> {
    return Repo.findAll({
      where: { userId },
    });
  }

  /**
   * Create a new repo
   */
  async create(repoData: IRepoCreationAttributes): Promise<Repo> {
    return Repo.create(repoData);
  }

  /**
   * Save a repository with badge information
   * Returns the repo ID or null on error
   */
  async saveRepo(
    githubRepoId: number | null,
    gitlabRepoId: number | null,
    DEICommitSHA: string,
    repoLink: string,
    badgeType: string,
    attachment: string,
    userId: number
  ): Promise<number | null> {
    // Validate that exactly one of githubRepoId or gitlabRepoId is provided
    if ((githubRepoId && gitlabRepoId) || (!githubRepoId && !gitlabRepoId)) {
      logger.error('Error creating repo: provide either githubRepoId or gitlabRepoId');
      return null;
    }

    try {
      // Verify user exists
      const user = await User.findOne({ where: { id: userId } });
      if (!user) {
        throw new Error(`User with id '${userId}' not found.`);
      }

      // Create the repo
      const repo = await this.create({
        githubRepoId,
        gitlabRepoId,
        DEICommitSHA,
        repoLink,
        badgeType,
        attachment,
        userId: user.id,
      });

      return repo.id;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error saving repo:', errorMessage);
      return null;
    }
  }

  /**
   * Get all badged repos (excluding DEICommitSHA)
   */
  async getAllBadgedRepos(): Promise<Repo[]> {
    return this.findAll(['DEICommitSHA']);
  }
}
