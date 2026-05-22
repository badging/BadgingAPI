import {
  JsonController,
  Get,
  Post,
  QueryParam,
  Body,
  Res,
} from 'routing-controllers';
import { Response } from 'express';
import { Service } from 'typedi';

import { AuthService } from '../services/auth.service';

import { Provider } from '../../shared/types';

import { isProduction } from '../../shared/config/environment';
import { renderDevRepoForm } from '../../dev/render-dev-form';
import { AppError } from '../../shared/errors';

@JsonController('/api')
@Service()
export class AuthController {
  constructor(private authService: AuthService) {}

  // -------------------------
  // LOGIN ENTRY
  // -------------------------

  @Get('/login')
  // @Redirect(':url')
  login(@QueryParam('provider') provider: Provider, @Res() res: Response) {
    if (!provider) {
      throw new AppError('Provider is required', 400);
    }

    const { data } = this.authService.getLoginUrl(provider);

    if (!data) {
      throw new AppError('Failed to generate login URL', 500);
    }

    //return { url: data };
    res.redirect(data);
    return;
  }

  // -------------------------
  // PROVIDER LOGIN
  // -------------------------

  @Get('/auth/github')
  authGitHub(@Res() res: Response) {
    const { data } = this.authService.getLoginUrl('github');

    if (!data) {
      throw new AppError('GitHub auth URL generation failed', 500);
    }

    return res.redirect(data);
  }

  @Get('/auth/gitlab')
  authGitLab(@Res() res: Response) {
    const { data } = this.authService.getLoginUrl('gitlab');

    if (!data) {
      throw new AppError('GitLab auth URL generation failed', 500);
    }

    res.redirect(data);
    return;
  }

  // -------------------------
  // EVENT BADGING AUTH
  // -------------------------

  @Post('/auth/github')
  authGitHubEventBadging(
    @Body() body: { type?: string; title?: string; body?: string }
  ) {
    if (body.type !== 'event-badging') {
      const { data } = this.authService.getLoginUrl('github');

      if (!data) {
        throw new AppError('GitHub auth generation failed', 500);
      }

      return { redirectUrl: data };
    }

    if (!body.title || !body.body) {
      throw new AppError('Title and body are required', 400);
    }

    const { data } = this.authService.getEventBadgingAuthUrl(
      body.title,
      body.body
    );

    if (!data) {
      throw new AppError('Failed to generate event badging auth URL', 500);
    }

    return { authorizationLink: data };
  }

  // -------------------------
  // CALLBACKS
  // -------------------------

  @Get('/callback/github')
  async callbackGitHubGet(
    @QueryParam('code') code: string,
    @QueryParam('state') state: string,
    @Res() res: Response
  ) {
    return this.handleGitHubCallback(code, state, res);
  }

  @Post('/callback/github')
  async callbackGitHubPost(
    @Body() body: { code?: string },
    @QueryParam('code') queryCode: string,
    @QueryParam('state') state: string,
    @Res() res: Response
  ) {
    const code = body?.code || queryCode;
    return this.handleGitHubCallback(code, state, res);
  }

  @Get('/callback/gitlab')
  async callbackGitLabGet(
    @QueryParam('code') code: string,
    @Res() res: Response
  ) {
    return this.handleGitLabCallback(code, res);
  }

  @Post('/callback/gitlab')
  async callbackGitLabPost(
    @Body() body: { code?: string },
    @QueryParam('code') queryCode: string,
    @Res() res: Response
  ) {
    const code = body?.code || queryCode;
    return this.handleGitLabCallback(code, res);
  }

  // -------------------------
  // HANDLERS
  // -------------------------

  private async handleGitHubCallback(
    code: string,
    state: string | undefined,
    res: Response
  ) {
    if (!code) {
      throw new AppError('Code is required', 400);
    }

    const result = await this.authService.handleGitHubCallback(code, state);

    if (!result.data) {
      throw new AppError('GitHub callback failed', 500);
    }

    if ('issueUrl' in result.data) {
      return res.redirect(result.data.issueUrl);
    }

    if (isProduction()) {
      return res.status(200).json(result.data);
    }

    return res
      .status(200)
      .send(renderDevRepoForm(result.data, 'github'));
  }

  private async handleGitLabCallback(code: string, res: Response) {
    if (!code) {
      throw new AppError('Code is required', 400);
    }

    const result = await this.authService.handleGitLabCallback(code);

    if (!result.data) {
      throw new AppError('GitLab callback failed', 500);
    }

    if (isProduction()) {
      return res.status(200).json(result.data);
    }

    return res
      .status(200)
      .send(renderDevRepoForm(result.data, 'gitlab'));
  }
}