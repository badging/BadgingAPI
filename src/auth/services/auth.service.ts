import { Service } from 'typedi';
import { Octokit } from '@octokit/rest';

import {
  GitHubAuthService,
  GitHubAppService,
  GitHubApiService,
  GitLabAuthService,
  GitLabApiService,
  UserRepository,
  CryptoService,
  getEnvVar
} from '../../shared';

import {
  Provider,
  IAuthCallbackResult,
  IOperationResult
} from '../../shared/types';

import { AppError } from '../../shared/errors';

@Service()
export class AuthService {
  constructor(
    private githubAuthService: GitHubAuthService,
    private githubAppService: GitHubAppService,
    private githubApiService: GitHubApiService,
    private gitlabAuthService: GitLabAuthService,
    private gitlabApiService: GitLabApiService,
    private userRepository: UserRepository,
    private cryptoService: CryptoService
  ) {}

  // -------------------------
  // LOGIN URLS
  // -------------------------

  getLoginUrl(provider: Provider): IOperationResult<string> {
    if (provider === 'github') {
      if (!this.githubAuthService.isConfigured()) {
        throw new AppError('GitHub provider is not configured', 500);
      }

      return {
        data: this.githubAuthService.getProjectBadgingAuthUrl(),
        errors: [],
      };
    }

    if (provider === 'gitlab') {
      if (!this.gitlabAuthService.isConfigured()) {
        throw new AppError('GitLab provider is not configured', 500);
      }

      return {
        data: this.gitlabAuthService.getAuthUrl(),
        errors: [],
      };
    }

    throw new AppError(`Unknown provider: ${provider}`, 400);
  }

  // -------------------------
  // EVENT BADGING URL
  // -------------------------

  getEventBadgingAuthUrl(title: string, body: string): IOperationResult<string> {
    if (!this.githubAuthService.isEventBadgingConfigured()) {
      throw new AppError('GitHub event badging provider is not configured', 500);
    }

    const formData = JSON.stringify({
      title,
      body,
      type: 'event-badging'
    });

    const encryptedState = this.cryptoService.encrypt(formData);

    return {
      data: this.githubAuthService.getEventBadgingAuthUrl(encryptedState),
      errors: [],
    };
  }

  // -------------------------
  // GITHUB CALLBACK
  // -------------------------

  async handleGitHubCallback(
    code: string,
    state?: string
  ): Promise<IOperationResult<IAuthCallbackResult | { issueUrl: string }>> {

    const isEventBadging = !!state;

    const {
      access_token: accessToken,
      errors: tokenErrors
    } = await this.githubAuthService.requestAccessToken(
      code,
      isEventBadging
    );

    if (tokenErrors.length || !accessToken) {
      throw new AppError(
        tokenErrors.join(', ') || 'Failed to get access token',
        401
      );
    }

    const userOctokit =
      this.githubAuthService.createUserOctokit(accessToken);

    const { data: user } = await userOctokit.request('GET /user');

    if (state) {
      const appOctokit =
        await this.githubAppService.getInstallationOctokit(
          Number(getEnvVar('GITHUB_APP_INSTALLATION_ID'))
        );

      return this.handleEventBadgingCallback(appOctokit, state, user);
    }

    return this.handleProjectBadgingCallback(userOctokit);
  }

  // -------------------------
  // EVENT BADGING CALLBACK
  // -------------------------

  private async handleEventBadgingCallback(
    octokit: any,
    encryptedState: string,
    user: { login: string; html_url: string }
  ): Promise<IOperationResult<{ issueUrl: string }>> {

    const formData = this.cryptoService.decrypt(encryptedState);
    const parsed = JSON.parse(formData) as {
      title: string;
      body: string;
    };

    const baseMarkdown =
      this.cryptoService.convertToMarkdown(parsed.body);

    const markdown = [
      '### Submitted by',
      `- GitHub: @${user.login}`,
      `- Profile: ${user.html_url}`,
      '',
      '---',
      '',
      baseMarkdown
    ].join('\n');

    const result = await this.githubApiService.createIssue(
      octokit,
      getEnvVar('REPOSITORY_OWNER'),
      getEnvVar('REPOSITORY_NAME'),
      parsed.title,
      markdown
    );

    if (result.errors.length || !result.data) {
      throw new AppError(
        result.errors.join(', ') || 'Failed to create GitHub issue',
        500
      );
    }

    return {
      data: { issueUrl: result.data.url },
      errors: [],
    };
  }

  // -------------------------
  // PROJECT BADGING CALLBACK
  // -------------------------

  private async handleProjectBadgingCallback(
    octokit: Octokit
  ): Promise<IOperationResult<IAuthCallbackResult>> {

    const {
      data: userInfo,
      errors: userInfoErrors
    } = await this.githubApiService.getUserInfo(octokit);

    if (userInfoErrors.length || !userInfo) {
      throw new AppError(
        userInfoErrors.join(', ') || 'Failed to retrieve GitHub user info',
        500
      );
    }

    const savedUser = await this.userRepository.saveUser(
      userInfo.login,
      userInfo.name,
      userInfo.email,
      userInfo.id,
      null
    );

    if (!savedUser) {
      throw new AppError('Failed to save GitHub user', 500);
    }

    const {
      data: repositories,
      errors: repoErrors
    } = await this.githubApiService.getUserRepositories(octokit);

    if (repoErrors.length || !repositories) {
      throw new AppError(
        repoErrors.join(', ') || 'Failed to retrieve repositories',
        500
      );
    }

    return {
      data: {
        userId: savedUser.id,
        name: savedUser.name,
        username: savedUser.login,
        email: savedUser.email,
        repos: repositories,
        provider: 'github',
      },
      errors: [],
    };
  }

  // -------------------------
  // GITLAB CALLBACK
  // -------------------------

  async handleGitLabCallback(
    code: string
  ): Promise<IOperationResult<IAuthCallbackResult>> {

    const {
      access_token: accessToken,
      errors: tokenErrors
    } = await this.gitlabAuthService.requestAccessToken(code);

    if (tokenErrors.length || !accessToken) {
      throw new AppError(
        tokenErrors.join(', ') || 'Failed to get GitLab access token',
        401
      );
    }

    const {
      data: userInfo,
      errors: userInfoErrors
    } = await this.gitlabApiService.getUserInfo(accessToken);

    if (userInfoErrors.length || !userInfo) {
      throw new AppError(
        userInfoErrors.join(', ') || 'Failed to retrieve GitLab user info',
        500
      );
    }

    const savedUser = await this.userRepository.saveUser(
      userInfo.login,
      userInfo.name,
      userInfo.email,
      null,
      userInfo.id
    );

    if (!savedUser) {
      throw new AppError('Failed to save GitLab user', 500);
    }

    const {
      data: repositories,
      errors: repoErrors
    } = await this.gitlabApiService.getUserRepositories(accessToken);

    if (repoErrors.length || !repositories) {
      throw new AppError(
        repoErrors.join(', ') || 'Failed to retrieve GitLab repositories',
        500
      );
    }

    return {
      data: {
        userId: savedUser.id,
        name: savedUser.name,
        username: savedUser.login,
        email: savedUser.email,
        repos: repositories,
        provider: 'gitlab',
      },
      errors: [],
    };
  }
}