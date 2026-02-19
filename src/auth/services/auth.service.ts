import { Service } from 'typedi';
import { Octokit } from '@octokit/rest';
import {
  GitHubAuthService,
  GitHubApiService,
  GitLabAuthService,
  GitLabApiService,
  UserRepository,
  CryptoService,
} from '../../shared';
import { Provider, IAuthCallbackResult, IOperationResult } from '../../shared/types';

@Service()
export class AuthService {
  constructor(
    private githubAuthService: GitHubAuthService,
    private githubApiService: GitHubApiService,
    private gitlabAuthService: GitLabAuthService,
    private gitlabApiService: GitLabApiService,
    private userRepository: UserRepository,
    private cryptoService: CryptoService
  ) {}

  /**
   * Get login redirect URL for a provider
   */
  getLoginUrl(provider: Provider): IOperationResult<string> {
    if (provider === 'github') {
      if (!this.githubAuthService.isConfigured()) {
        return {
          data: null,
          errors: ['GitHub provider is not configured'],
        };
      }
      return {
        data: this.githubAuthService.getProjectBadgingAuthUrl(),
        errors: [],
      };
    }

    if (provider === 'gitlab') {
      if (!this.gitlabAuthService.isConfigured()) {
        return {
          data: null,
          errors: ['GitLab provider is not configured'],
        };
      }
      return {
        data: this.gitlabAuthService.getAuthUrl(),
        errors: [],
      };
    }

    return {
      data: null,
      errors: [`Unknown provider: ${provider as string}`],
    };
  }

  /**
   * Get event badging authorization URL with encrypted form data
   */
  getEventBadgingAuthUrl(title: string, body: string): IOperationResult<string> {
    if (!this.githubAuthService.isEventBadgingConfigured()) {
      return {
        data: null,
        errors: ['GitHub event badging provider is not configured'],
      };
    }

    const formData = JSON.stringify({ title, body, type: 'event-badging' });
    const encryptedState = this.cryptoService.encrypt(formData);
    const url = this.githubAuthService.getEventBadgingAuthUrl(encryptedState);

    return {
      data: url,
      errors: [],
    };
  }

  /**
   * Handle GitHub OAuth callback
   */
  async handleGitHubCallback(
    code: string,
    state?: string
  ): Promise<IOperationResult<IAuthCallbackResult | { issueUrl: string }>> {
    const isEventBadging = !!state;

    // Exchange code for access token
    const { access_token: accessToken, errors: tokenErrors } =
      await this.githubAuthService.requestAccessToken(code, isEventBadging);

    if (tokenErrors.length > 0 || !accessToken) {
      return {
        data: null,
        errors: tokenErrors.length > 0 ? tokenErrors : ['Failed to get access token'],
      };
    }

    const octokit = this.githubAuthService.createOctokit(accessToken);

    // Handle event badging flow - create issue and return URL
    if (state) {
      return this.handleEventBadgingCallback(octokit, state);
    }

    // Handle project badging flow - return user data and repos
    return this.handleProjectBadgingCallback(octokit);
  }

  /**
   * Handle event badging OAuth callback - creates issue
   */
  private async handleEventBadgingCallback(
    octokit: Octokit,
    encryptedState: string
  ): Promise<IOperationResult<{ issueUrl: string }>> {
    try {
      const formData = this.cryptoService.decrypt(encryptedState);
      const parsedFormData = JSON.parse(formData) as { title: string; body: string };
      const markdown = this.cryptoService.convertToMarkdown(parsedFormData.body);

      const result = await this.githubApiService.createIssue(
        octokit,
        'adeyinkaoresanya',
        'sandbox-event-dei',
        parsedFormData.title,
        markdown
      );

      if (result.errors.length > 0 || !result.data) {
        return {
          data: null,
          errors: result.errors,
        };
      }

      return {
        data: { issueUrl: result.data.url },
        errors: [],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        data: null,
        errors: [errorMessage],
      };
    }
  }

  /**
   * Handle project badging OAuth callback - returns user and repos
   */
  private async handleProjectBadgingCallback(
    octokit: Octokit
  ): Promise<IOperationResult<IAuthCallbackResult>> {
    // Get user info
    const { data: userInfo, errors: userInfoErrors } =
      await this.githubApiService.getUserInfo(octokit);

    if (userInfoErrors.length > 0 || !userInfo) {
      return {
        data: null,
        errors: userInfoErrors,
      };
    }

    // Save user to database
    const savedUser = await this.userRepository.saveUser(
      userInfo.login,
      userInfo.name,
      userInfo.email,
      userInfo.id,
      null
    );

    if (!savedUser) {
      return {
        data: null,
        errors: ['Error saving user info'],
      };
    }

    // Get user repositories
    const { data: repositories, errors: repoErrors } =
      await this.githubApiService.getUserRepositories(octokit);

    if (repoErrors.length > 0 || !repositories) {
      return {
        data: null,
        errors: repoErrors,
      };
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

  /**
   * Handle GitLab OAuth callback
   */
  async handleGitLabCallback(code: string): Promise<IOperationResult<IAuthCallbackResult>> {
    // Exchange code for access token
    const { access_token: accessToken, errors: tokenErrors } =
      await this.gitlabAuthService.requestAccessToken(code);

    if (tokenErrors.length > 0 || !accessToken) {
      return {
        data: null,
        errors: tokenErrors.length > 0 ? tokenErrors : ['Failed to get access token'],
      };
    }

    // Get user info
    const { data: userInfo, errors: userInfoErrors } =
      await this.gitlabApiService.getUserInfo(accessToken);

    if (userInfoErrors.length > 0 || !userInfo) {
      return {
        data: null,
        errors: userInfoErrors,
      };
    }

    // Save user to database
    const savedUser = await this.userRepository.saveUser(
      userInfo.login,
      userInfo.name,
      userInfo.email,
      null,
      userInfo.id
    );

    if (!savedUser) {
      return {
        data: null,
        errors: ['Error saving user info'],
      };
    }

    // Get user repositories
    const { data: repositories, errors: repoErrors } =
      await this.gitlabApiService.getUserRepositories(accessToken);

    if (repoErrors.length > 0 || !repositories) {
      return {
        data: null,
        errors: repoErrors,
      };
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
