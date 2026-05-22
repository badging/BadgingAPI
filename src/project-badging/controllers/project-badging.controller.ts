import {
  JsonController,
  Get,
  Post,
  Body,
  Res,
  QueryParam,
  ContentType,
} from 'routing-controllers';
import { Service } from 'typedi';
import { Response } from 'express';

import { ProjectBadgingService } from '../services/project-badging.service';
import { UserRepository } from '../../shared';
import { Provider } from '../../shared/types';

import { AppError } from '../../shared/errors'; 
import { logger } from '../../shared/logger'; 


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

  @Get('/badgedRepos')
  async getBadgedRepos(@Res() response: Response): Promise<Response> {
    const repos = await this.projectBadgingService.getBadgedRepos();

    logger.info('Fetched badged repos', {
      count: repos.length,
    });

    return response.json(repos);
  }

  @Post('/repos-to-badge')
  async reposToBadge(
    @Body() body: RepoToBadgeRequest,
    @Res() response: Response
  ): Promise<Response> {
    const { userId, provider, repos: selectedRepos = [] } = body;

    // -------------------------
    // VALIDATION (business errors)
    // -------------------------
    if (!provider) {
      throw new AppError('Provider is required', 400);
    }

    if (provider !== 'github' && provider !== 'gitlab') {
      throw new AppError('Invalid provider', 400);
    }

    if (!userId) {
      throw new AppError('UserId is required', 400);
    }

    if (!selectedRepos.length) {
      throw new AppError('No repositories selected', 400);
    }

    // -------------------------
    // USER FETCH (NO try/catch)
    // -------------------------
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // -------------------------
    // BUSINESS LOGIC
    // -------------------------
    const repositoryIds = selectedRepos.map((repo) => repo.id);

    logger.info('Starting repo badging process', {
      userId,
      provider,
      repoCount: repositoryIds.length,
    });

    const results = await this.projectBadgingService.scanRepositories(
      user.id,
      user.name,
      user.email,
      repositoryIds,
      provider
    );

    return response.status(200).json({ results });
  }

  @Get('/project-badging-successful')
  @ContentType('text/html')
  projectBadgingSuccessful(
    @QueryParam('provider') provider: string,
    @QueryParam('userId') userId: string,
    @QueryParam('name') name: string,
    @QueryParam('email') email: string
  ) {
    return `
      <html>
        <body>
          <h1>Badge Scan Successful!</h1>
          <p>User: ${name} (${email})</p>
          <p>Provider: ${provider}</p>
          <p>User ID: ${userId}</p>
        </body>
      </html>
    `;
  }
}
