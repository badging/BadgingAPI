import { JsonController, Get, Post, Body, Res } from 'routing-controllers';
import { Service } from 'typedi';
import { Response } from 'express';
import { ProjectBadgingService } from '../services/project-badging.service';
import { UserRepository } from '../../shared';
import { Provider } from '../../shared/types';

interface RepoToBadgeRequest {
  userId: number;
  provider: Provider;
  repos: Array<{ id: number; fullName?: string }>;
}

@JsonController('/api')
@Service()
export class ProjectBadgingController {
  constructor(
    private projectBadgingService: ProjectBadgingService,
    private userRepository: UserRepository
  ) {}

  /**
   * GET /api/badgedRepos
   * Get all badged repositories
   */
  @Get('/badgedRepos')
  async getBadgedRepos(@Res() response: Response): Promise<Response> {
    try {
      const repos = await this.projectBadgingService.getBadgedRepos();
      return response.json(repos);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return response.status(500).json({ message: 'Error retrieving repos', error: errorMessage });
    }
  }

  /**
   * POST /api/repos-to-badge
   * Scan selected repositories and award badges
   */
  @Post('/repos-to-badge')
  async reposToBadge(
    @Body() body: RepoToBadgeRequest,
    @Res() response: Response
  ): Promise<Response> {
    const { userId, provider, repos: selectedRepos = [] } = body;

    // Validate provider
    if (!provider) {
      return response.status(400).json({ error: 'provider missing' });
    }

    if (provider !== 'github' && provider !== 'gitlab') {
      return response.status(400).json({ error: `Unknown provider: ${provider as string}` });
    }

    // Validate userId
    if (!userId) {
      return response.status(400).json({ error: 'userId missing' });
    }

    // Find user
    let user;
    try {
      user = await this.userRepository.findById(userId);
      if (!user) {
        return response.status(404).json({ error: 'User not found' });
      }
    } catch (error) {
      return response.status(500).json({ error: 'Error fetching user data' });
    }

    // Extract repository IDs
    const repositoryIds = selectedRepos.map((repo) => repo.id);

    if (repositoryIds.length === 0) {
      return response.status(400).json({ error: 'No repositories selected' });
    }

    try {
      // Scan repositories and award badges
      const results = await this.projectBadgingService.scanRepositories(
        user.id,
        user.name,
        user.email,
        repositoryIds,
        provider
      );

      return response.status(200).json({ results });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return response
        .status(500)
        .json({ error: 'Error processing repositories', details: errorMessage });
    }
  }
}
