import { JsonController, Get, Post, QueryParam, Body, Res, Redirect } from 'routing-controllers';
import { Service } from 'typedi';
import { Response } from 'express';
import { AuthService } from '../services/auth.service';
import { Provider } from '../../shared/types';
import { isDevelopment, isProduction } from '../../shared/config/environment';

@JsonController('/api')
@Service()
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * GET /api/login
   * Redirects to the appropriate OAuth provider login page
   */
  @Get('/login')
  login(@QueryParam('provider') provider: Provider, @Res() response: Response): Response | void {
    if (!provider) {
      return response.status(400).json({ error: 'Provider is required' });
    }

    const result = this.authService.getLoginUrl(provider);

    if (result.errors.length > 0 || !result.data) {
      return response.status(500).json({ error: result.errors.join(', ') });
    }

    response.redirect(result.data);
  }

  /**
   * GET /api/auth/github
   * Redirect to GitHub OAuth
   */
  @Get('/auth/github')
  @Redirect('')
  authGitHub(): string {
    const result = this.authService.getLoginUrl('github');
    if (result.errors.length > 0 || !result.data) {
      throw new Error(result.errors.join(', '));
    }
    return result.data;
  }

  /**
   * POST /api/auth/github
   * Handle event badging GitHub auth (returns authorization link)
   */
  @Post('/auth/github')
  authGitHubEventBadging(
    @Body() body: { type?: string; title?: string; body?: string },
    @Res() response: Response
  ): Response | void {
    if (body.type === 'event-badging') {
      if (!body.title || !body.body) {
        return response
          .status(400)
          .json({ error: 'Title and body are required for event badging' });
      }

      const result = this.authService.getEventBadgingAuthUrl(body.title, body.body);

      if (result.errors.length > 0 || !result.data) {
        return response.status(500).json({ error: result.errors.join(', ') });
      }

      return response.json({ authorizationLink: result.data });
    }

    // For non-event-badging, redirect to GitHub OAuth
    const result = this.authService.getLoginUrl('github');
    if (result.errors.length > 0 || !result.data) {
      return response.status(500).json({ error: result.errors.join(', ') });
    }

    response.redirect(result.data);
  }

  /**
   * GET /api/auth/gitlab
   * Redirect to GitLab OAuth
   */
  @Get('/auth/gitlab')
  @Redirect('')
  authGitLab(): string {
    const result = this.authService.getLoginUrl('gitlab');
    if (result.errors.length > 0 || !result.data) {
      throw new Error(result.errors.join(', '));
    }
    return result.data;
  }

  /**
   * GET /api/callback/github
   * Handle GitHub OAuth callback
   */
  @Get('/callback/github')
  async callbackGitHubGet(
    @QueryParam('code') code: string,
    @QueryParam('state') state: string | undefined,
    @Res() response: Response
  ): Promise<Response | void> {
    return this.handleGitHubCallback(code, state, response);
  }

  /**
   * POST /api/callback/github
   * Handle GitHub OAuth callback (POST variant)
   */
  @Post('/callback/github')
  async callbackGitHubPost(
    @Body() body: { code?: string },
    @QueryParam('code') queryCode: string | undefined,
    @QueryParam('state') state: string | undefined,
    @Res() response: Response
  ): Promise<Response | void> {
    const code = body.code || queryCode;
    if (!code) {
      return response.status(400).json({ error: 'Code is required' });
    }
    return this.handleGitHubCallback(code, state, response);
  }

  /**
   * GET /api/callback/gitlab
   * Handle GitLab OAuth callback
   */
  @Get('/callback/gitlab')
  async callbackGitLabGet(
    @QueryParam('code') code: string,
    @Res() response: Response
  ): Promise<Response> {
    return this.handleGitLabCallback(code, response);
  }

  /**
   * POST /api/callback/gitlab
   * Handle GitLab OAuth callback (POST variant)
   */
  @Post('/callback/gitlab')
  async callbackGitLabPost(
    @Body() body: { code?: string },
    @QueryParam('code') queryCode: string | undefined,
    @Res() response: Response
  ): Promise<Response> {
    const code = body.code || queryCode;
    if (!code) {
      return response.status(400).json({ error: 'Code is required' });
    }
    return this.handleGitLabCallback(code, response);
  }

  /**
   * Common handler for GitHub OAuth callback
   */
  private async handleGitHubCallback(
    code: string,
    state: string | undefined,
    response: Response
  ): Promise<Response | void> {
    if (!code) {
      return response.status(400).json({ error: 'Code is required' });
    }

    const result = await this.authService.handleGitHubCallback(code, state);

    if (result.errors.length > 0 || !result.data) {
      return response.status(500).json({ error: result.errors.join(', ') });
    }

    // Event badging callback - redirect to issue URL
    if ('issueUrl' in result.data) {
      response.redirect(result.data.issueUrl);
      return;
    }

    // Project badging callback - return user data
    if (isProduction()) {
      return response.status(200).json(result.data);
    }

    // Development mode - render HTML form
    if (isDevelopment()) {
      const data = result.data;
      return response.status(200).send(this.renderDevRepoForm(data, 'github'));
    }

    return response.status(500).json({ error: 'Unknown process mode' });
  }

  /**
   * Common handler for GitLab OAuth callback
   */
  private async handleGitLabCallback(code: string, response: Response): Promise<Response> {
    if (!code) {
      return response.status(400).json({ error: 'Code is required' });
    }

    const result = await this.authService.handleGitLabCallback(code);

    if (result.errors.length > 0 || !result.data) {
      return response.status(500).json({ error: result.errors.join(', ') });
    }

    if (isProduction()) {
      return response.status(200).json(result.data);
    }

    // Development mode - render HTML form
    if (isDevelopment()) {
      return response.status(200).send(this.renderDevRepoForm(result.data, 'gitlab'));
    }

    return response.status(500).json({ error: 'Unknown process mode' });
  }

  /**
   * Render development HTML form for repository selection
   */
  private renderDevRepoForm(
    data: {
      userId: number;
      name: string;
      username: string;
      email: string;
      repos: Array<{ id: number; fullName: string }>;
    },
    provider: string
  ): string {
    return `
      <html>
      <head>
        <title>Repo List</title>
      </head>
      <body>
        <h1>Welcome ${data.name}</h1>
        <h2>Username: ${data.username}</h2>
        <h2>Email: ${data.email}</h2>
        <form action="/api/repos-to-badge" method="post">
          <input type="hidden" name="provider" value="${provider}">
          <input type="hidden" name="userId" value="${data.userId}">
          <h2>Select Repositories:</h2>
          ${data.repos
            .map(
              (repo) => `
              <div>
                <input type="checkbox" name="repos[]" value="${repo.id}">
                <label for="${repo.id}">${repo.fullName}</label>
              </div>
            `
            )
            .join('')}
          <br>
          <input type="submit" value="Submit">
        </form>
      </body>
    </html>
    `;
  }
}
