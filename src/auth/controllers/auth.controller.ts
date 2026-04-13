import {
  JsonController,
  Get,
  Post,
  QueryParam,
  Body,
  Redirect,
  BadRequestError,
  InternalServerError,
  ContentType,
  Res,
} from 'routing-controllers';
import { Response } from 'express';
import { Service } from 'typedi';
import { AuthService } from '../services/auth.service';
import { Provider } from '../../shared/types';
import { isProduction } from '../../shared/config/environment';

@JsonController('/api')
@Service()
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * LOGIN ENTRY
   */
  @Get('/login')
  @Redirect(':url')
  login(@QueryParam('provider') provider: Provider) {
    if (!provider) throw new BadRequestError('Provider is required');

    const result = this.authService.getLoginUrl(provider);

    if (result.errors.length || !result.data) {
      throw new InternalServerError(result.errors.join(', '));
    }

    return { url: result.data };
  }

  /**
   * PROVIDER LOGIN
   */


@Get('/auth/github')
// @Redirect('')
authGitHub(@Res() res: Response): void {
  const result = this.authService.getLoginUrl('github');

  if (result.errors.length || !result.data) {
    throw new InternalServerError(result.errors.join(', '));
  }
  res.redirect(result.data);
  return;

  // return {
  //   url: result.data,
  //   statusCode: 302
  // };

}

  @Get('/auth/gitlab')
 // @Redirect(':url')
  authGitLab(@Res() res: Response): void {
    const result = this.authService.getLoginUrl('gitlab');

    if (result.errors.length || !result.data) {
      console.error('GitLab auth error:', result.errors);
      throw new InternalServerError(result.errors.join(', '));
    }
    res.redirect(result.data);
    return;

    // return { url: result.data };
  }

  /**
   * EVENT BADGING AUTH
   */

  @Post('/auth/github')
  authGitHubEventBadging(
    @Body() body: { type?: string; title?: string; body?: string }
  ) {
    if (body.type === 'event-badging') {
      if (!body.title || !body.body) {
        throw new BadRequestError('Title and body are required');
      }

      const result = this.authService.getEventBadgingAuthUrl(
        body.title,
        body.body
      );

      if (result.errors.length || !result.data) {
        throw new InternalServerError(result.errors.join(', '));
      }

      return { authorizationLink: result.data };
    }

    const result = this.authService.getLoginUrl('github');

    if (result.errors.length || !result.data) {
      throw new InternalServerError(result.errors.join(', '));
    }

    return { redirectUrl: result.data };
  }

  /**
   * CALLBACKS
   */

 /**
   * GET /api/callback/github
   * Ensure we pass @Res() and return Promise<void>
   */
  @Get('/callback/github')
  async callbackGitHubGet(
    @QueryParam('code') code: string,
    @QueryParam('state') state: string,
    @Res() response: Response // Inject the response object
  ): Promise<void> {
    await this.handleGitHubCallback(code, state, response);
    return; // Explicitly return nothing so the framework stops here
  }

  /**
   * POST /api/callback/github
   * Consistency is key: use the same Res pattern
   */
  @Post('/callback/github')
  async callbackGitHubPost(
    @Body() body: { code?: string },
    @QueryParam('code') queryCode: string,
    @QueryParam('state') state: string,
    @Res() response: Response
  ): Promise<void> {
    const code = body.code || queryCode;
    await this.handleGitHubCallback(code, state, response);
    return;
  }

  @Get('/callback/gitlab')
  async callbackGitLabGet(
    @QueryParam('code') code: string,
    @Res() response: Response
  ): Promise<void> {
    await this.handleGitLabCallback(code, response);
    return;
  }

  @Post('/callback/gitlab')
  async callbackGitLabPost(
    @Body() body: { code?: string },
    @QueryParam('code') queryCode: string,
    @Res() response: Response
  ): Promise<void> {
    const code = body.code || queryCode;
    return this.handleGitLabCallback(code, response);
  }

  /**
   * HANDLERS
   */

  private async handleGitHubCallback(code: string, state: string | undefined, res: Response): Promise<void> {
    if (!code) {
    res.status(400).json({ error: 'Code is required' });
    return; // STOP HERE
  }
    
    const result = await this.authService.handleGitHubCallback(code, state);
    
    if (result.errors.length > 0 || !result.data) {
      res.status(500).json({ error: result.errors.join(', ') });
      return;
    }

    if ('issueUrl' in result.data) {
      res.redirect(result.data.issueUrl);
      return; // Stop execution here
    }

    // For JSON or HTML, send it and return void
    if (isProduction()) {
      res.status(200).json(result.data);
      return;
    }

    res.status(200).send(this.renderDevRepoForm(result.data, 'github'));
    return;
  }

  private async handleGitLabCallback(code: string, res: Response): Promise<void> {
    if (!code) {
      res.status(400).json({ error: 'Code is required' });
      return;
    }

    const result = await this.authService.handleGitLabCallback(code);

    if (result.errors.length || !result.data) {
        console.error('GitLab auth error:', result.errors);
      throw new InternalServerError(result.errors.join(', '));
    }

    if (isProduction()) {
      res.status(200).json(result.data);
      return;
    }

     res.status(200).send(this.renderDevRepoForm(result.data, 'gitlab'));
  }

  /**
   * DEV HTML RENDERER
   */

@ContentType('text/html')
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
  <title>Select Repositories</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1, h2, h3 { margin: 5px 0; }
    .repo { margin: 5px 0; }
    button { margin-top: 10px; padding: 8px 12px; font-size: 14px; }
  </style>
</head>
<body>
  <h1>Welcome ${data.name}</h1>
  <h3>Username: ${data.username}</h3>
  <h3>Email: ${data.email}</h3>

  <form id="reposForm">
    <input type="hidden" name="provider" value="${provider}">
    <input type="hidden" name="userId" value="${data.userId}">

    <h2>Select Repositories:</h2>
    ${data.repos
      .map(
        (repo) => `
      <div class="repo">
        <input type="checkbox" name="repos[]" value="${repo.id}" id="repo-${repo.id}">
        <label for="repo-${repo.id}">${repo.fullName}</label>
      </div>
    `
      )
      .join('')}

    <button type="submit">Scan Projects</button>
  </form>

  <script>
    const form = document.getElementById('reposForm');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = new FormData(form);
      const payload = {
        provider: formData.get('provider'),
        userId: Number(formData.get('userId')),
        repos: formData.getAll('repos[]').map(id => ({ id: Number(id) }))
      };

      try {
        const res = await fetch('/api/repos-to-badge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const text = await res.text();
          alert('Error: ' + text);
          return;
        }

        const json = await res.json();

        // Redirect to success page with query parameters
        const params = new URLSearchParams({
          provider: payload.provider,
          userId: payload.userId,
          name: '${data.name}',
          email: '${data.email}'
        }).toString();

        window.location.href = '/api/project-badging-successful?' + params;

      } catch (err) {
        alert('Network error: ' + err);
      }
    });
  </script>
</body>
</html>
  `;
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