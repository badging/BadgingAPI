import { Service } from 'typedi';
import { User } from '../models/user.model';
import { IUserCreationAttributes } from '../../types';
import { logger } from '../../logger' 

@Service()
export class UserRepository {
  /**
   * Find a user by their internal ID
   */
  async findById(userId: number): Promise<User | null> {
    return User.findOne({ where: { id: userId } });
  }

  /**
   * Find a user by their GitHub ID
   */
  async findByGithubId(githubId: number): Promise<User | null> {
    return User.findOne({ where: { githubId } });
  }

  /**
   * Find a user by their GitLab ID
   */
  async findByGitlabId(gitlabId: number): Promise<User | null> {
    return User.findOne({ where: { gitlabId } });
  }

  /**
   * Create a new user
   */
  async create(userData: IUserCreationAttributes): Promise<User> {
    return User.create(userData);
  }

  /**
   * Update an existing user
   */
  async update(user: User, updates: Partial<IUserCreationAttributes>): Promise<User> {
    await user.update(updates);
    return user;
  }

  /**
   * Save or update a user based on GitHub/GitLab ID
   * Returns the saved user or null on error
   */
  async saveUser(
    login: string,
    name: string,
    email: string,
    githubId: number | null,
    gitlabId: number | null
  ): Promise<User | null> {
    // Validate that exactly one of githubId or gitlabId is provided
    if ((githubId && gitlabId) || (!githubId && !gitlabId)) {
      logger.error('Error creating user: provide either githubId or gitlabId');
      return null;
    }

    try {
      // Find existing user by provider ID
      let user: User | null = null;

      if (githubId) {
        user = await this.findByGithubId(githubId);
      } else if (gitlabId) {
        user = await this.findByGitlabId(gitlabId);
      }

      if (!user) {
        // Create new user
        user = await this.create({
          login,
          name,
          email,
          githubId,
          gitlabId,
        });
        logger.info(`New user created: ${user.login}`);
        return user;
      }

      // User exists - update if necessary
      const updates: Partial<IUserCreationAttributes> = {};

      if (user.name !== name) {
        updates.name = name;
      }
      if (user.email !== email) {
        updates.email = email;
      }
      if (user.login !== login) {
        updates.login = login;
      }

      if (Object.keys(updates).length > 0) {
        await this.update(user, updates);
        logger.info(`User ${user.login} updated: ${Object.keys(updates).join(', ')}`);
      } else {
        logger.info('User already exists');
      }

      return user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error saving user: ${errorMessage}`);
      return null;
    }
  }
}
