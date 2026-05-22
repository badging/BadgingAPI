// import { Service } from 'typedi';
// import { Octokit } from '@octokit/rest';
// import {
//   GitHubAuthService,
//   GitHubAppService,
//   GitHubApiService,
//   GitLabAuthService,
//   GitLabApiService,
//   UserRepository,
//   CryptoService,
//   getEnvVar
// } from '../../shared';
// import { Provider, IAuthCallbackResult, IOperationResult } from '../../shared/types';

// @Service()
// export class AuthService {
//   constructor(
//     private githubAuthService: GitHubAuthService,
//     private githubAppService: GitHubAppService,
//     private githubApiService: GitHubApiService,
//     private gitlabAuthService: GitLabAuthService,
//     private gitlabApiService: GitLabApiService,
//     private userRepository: UserRepository,
//     private cryptoService: CryptoService
//   ) {}

//   /**
//    * Get login redirect URL for a provider
//    */
//   getLoginUrl(provider: Provider): IOperationResult<string> {
//     if (provider === 'github') {
//       if (!this.githubAuthService.isConfigured()) {
//         return {
//           data: null,
//           errors: ['GitHub provider is not configured'],
//         };
//       }
//       return {
//         data: this.githubAuthService.getProjectBadgingAuthUrl(),
//         errors: [],
//       };
//     }

//     if (provider === 'gitlab') {
//       if (!this.gitlabAuthService.isConfigured()) {
//         return {
//           data: null,
//           errors: ['GitLab provider is not configured'],
//         };
//       }
//       return {
//         data: this.gitlabAuthService.getAuthUrl(),
//         errors: [],
//       };
//     }

//     return {
//       data: null,
//       errors: [`Unknown provider: ${provider as string}`],
//     };
//   }

//   /**
//    * Get event badging authorization URL with encrypted form data
//    */
//   getEventBadgingAuthUrl(title: string, body: string): IOperationResult<string> {
//     if (!this.githubAuthService.isEventBadgingConfigured()) {
//       return {
//         data: null,
//         errors: ['GitHub event badging provider is not configured'],
//       };
//     }

//     const formData = JSON.stringify({ title, body, type: 'event-badging' });
//     const encryptedState = this.cryptoService.encrypt(formData);
//     const url = this.githubAuthService.getEventBadgingAuthUrl(encryptedState);

//     return {
//       data: url,
//       errors: [],
//     };
//   }

//   /**
//    * Handle GitHub OAuth callback
//    */
//   async handleGitHubCallback(
//     code: string,
//     state?: string
//   ): Promise<IOperationResult<IAuthCallbackResult | { issueUrl: string }>> {
//     const isEventBadging = !!state;

//     // Exchange code for access token
//     const { access_token: accessToken, errors: tokenErrors } =
//       await this.githubAuthService.requestAccessToken(code, isEventBadging);

//     if (tokenErrors.length > 0 || !accessToken) {
//       return {
//         data: null,
//         errors: tokenErrors.length > 0 ? tokenErrors : ['Failed to get access token'],
//       };
//     }

//     const userOctokit = this.githubAuthService.createUserOctokit(accessToken);
//     const { data: user } = await userOctokit.request("GET /user");

//     // Handle event badging flow - create issue and return URL
//     if (state) {
//       const appOctokit = await this.githubAppService.getInstallationOctokit(Number(getEnvVar('GITHUB_APP_INSTALLATION_ID')));
//       //return this.handleEventBadgingCallback(octokit, state);
//       return this.handleEventBadgingCallback(appOctokit, state, user);
//     }

//     // Handle project badging flow - return user data and repos
//     //const octokit = this.githubAuthService.createOctokit(accessToken);
//     return this.handleProjectBadgingCallback(userOctokit);
//   }

//   /**
//    * Handle event badging OAuth callback - creates issue
//    */
//   private async handleEventBadgingCallback(
//     octokit: any,
//     encryptedState: string,
//     user: { login: string; html_url: string }
//   ): Promise<IOperationResult<{ issueUrl: string }>> {
//     try {
//       const formData = this.cryptoService.decrypt(encryptedState);
//       const parsedFormData = JSON.parse(formData) as { title: string; body: string };
//      // const markdown = this.cryptoService.convertToMarkdown(parsedFormData.body);

//      const baseMarkdown = this.cryptoService.convertToMarkdown(parsedFormData.body);

//       // const markdown = `### 👤 Submitted by
//       // - GitHub: @${user.login}
//       // - Profile: ${user.html_url}
//       // ---
//       // ${baseMarkdown}`.trim();  

//       const markdown = [
//       "### Submitted by",
//         `- GitHub: @${user.login}`,
//         `- Profile: ${user.html_url}`,
//         "",
//         "---",
//         "",
//         baseMarkdown
//       ].join("\n");

//       const result = await this.githubApiService.createIssue(
//         octokit,
//         getEnvVar('REPOSITORY_OWNER'),
//         getEnvVar('REPOSITORY_NAME'),
//         parsedFormData.title,
//         markdown
//       );

//       if (result.errors.length > 0 || !result.data) {
//         return {
//           data: null,
//           errors: result.errors,
//         };
//       }

//       return {
//         data: { issueUrl: result.data.url },
//         errors: [],
//       };
//     } catch (error) {
//       const errorMessage = error instanceof Error ? error.message : 'Unknown error';
//       return {
//         data: null,
//         errors: [errorMessage],
//       };
//     }
//   }

//   /**
//    * Handle project badging OAuth callback - returns user and repos
//    */
//   private async handleProjectBadgingCallback(
//     octokit: Octokit
//   ): Promise<IOperationResult<IAuthCallbackResult>> {
//     // Get user info
//     const { data: userInfo, errors: userInfoErrors } =
//       await this.githubApiService.getUserInfo(octokit);

//     if (userInfoErrors.length > 0 || !userInfo) {
//       return {
//         data: null,
//         errors: userInfoErrors,
//       };
//     }

//     // Save user to database
//     const savedUser = await this.userRepository.saveUser(
//       userInfo.login,
//       userInfo.name,
//       userInfo.email,
//       userInfo.id,
//       null
//     );

//     if (!savedUser) {
//       return {
//         data: null,
//         errors: ['Error saving user info'],
//       };
//     }

//     // Get user repositories
//     const { data: repositories, errors: repoErrors } =
//       await this.githubApiService.getUserRepositories(octokit);

//     if (repoErrors.length > 0 || !repositories) {
//       return {
//         data: null,
//         errors: repoErrors,
//       };
//     }

//     return {
//       data: {
//         userId: savedUser.id,
//         name: savedUser.name,
//         username: savedUser.login,
//         email: savedUser.email,
//         repos: repositories,
//         provider: 'github',
//       },
//       errors: [],
//     };
//   }

//   /**
//    * Handle GitLab OAuth callback
//    */
//   async handleGitLabCallback(code: string): Promise<IOperationResult<IAuthCallbackResult>> {
//     // Exchange code for access token
//     const { access_token: accessToken, errors: tokenErrors } =
//       await this.gitlabAuthService.requestAccessToken(code);

//     if (tokenErrors.length > 0 || !accessToken) {
//       return {
//         data: null,
//         errors: tokenErrors.length > 0 ? tokenErrors : ['Failed to get access token'],
//       };
//     }

//     // Get user info
//     const { data: userInfo, errors: userInfoErrors } =
//       await this.gitlabApiService.getUserInfo(accessToken);

//     if (userInfoErrors.length > 0 || !userInfo) {
//       return {
//         data: null,
//         errors: userInfoErrors,
//       };
//     }

//     // Save user to database
//     const savedUser = await this.userRepository.saveUser(
//       userInfo.login,
//       userInfo.name,
//       userInfo.email,
//       null,
//       userInfo.id
//     );

//     if (!savedUser) {
//       return {
//         data: null,
//         errors: ['Error saving user info'],
//       };
//     }

//     // Get user repositories
//     const { data: repositories, errors: repoErrors } =
//       await this.gitlabApiService.getUserRepositories(accessToken);

//     if (repoErrors.length > 0 || !repositories) {
//       return {
//         data: null,
//         errors: repoErrors,
//       };
//     }

//     return {
//       data: {
//         userId: savedUser.id,
//         name: savedUser.name,
//         username: savedUser.login,
//         email: savedUser.email,
//         repos: repositories,
//         provider: 'gitlab',
//       },
//       errors: [],
//     };
//   }
// }








// import { Service } from 'typedi';
// import { Octokit } from '@octokit/rest';

// import {
//   GitHubAuthService,
//   GitHubAppService,
//   GitHubApiService,
//   GitLabAuthService,
//   GitLabApiService,
//   UserRepository,
//   CryptoService,
//   getEnvVar
// } from '../../shared';

// import {
//   Provider,
//   IAuthCallbackResult,
//   IOperationResult
// } from '../../shared/types';

// import { AppError } from '../../shared/errors';

// @Service()
// export class AuthService {
//   constructor(
//     private githubAuthService: GitHubAuthService,
//     private githubAppService: GitHubAppService,
//     private githubApiService: GitHubApiService,
//     private gitlabAuthService: GitLabAuthService,
//     private gitlabApiService: GitLabApiService,
//     private userRepository: UserRepository,
//     private cryptoService: CryptoService
//   ) {}

//   /**
//    * Get login redirect URL
//    */
//   getLoginUrl(provider: Provider): IOperationResult<string> {

//     if (provider === 'github') {

//       if (!this.githubAuthService.isConfigured()) {
//         throw new AppError(
//           'GitHub provider is not configured',
//           500
//         );
//       }

//       return {
//         data: this.githubAuthService.getProjectBadgingAuthUrl(),
//         errors: [],
//       };
//     }

//     if (provider === 'gitlab') {

//       if (!this.gitlabAuthService.isConfigured()) {
//         throw new AppError(
//           'GitLab provider is not configured',
//           500
//         );
//       }

//       return {
//         data: this.gitlabAuthService.getAuthUrl(),
//         errors: [],
//       };
//     }

//     throw new AppError(
//       `Unknown provider: ${provider as string}`,
//       400
//     );
//   }

//   /**
//    * Event badging OAuth URL
//    */
//   getEventBadgingAuthUrl(
//     title: string,
//     body: string
//   ): IOperationResult<string> {

//     if (!this.githubAuthService.isEventBadgingConfigured()) {
//       throw new AppError(
//         'GitHub event badging provider is not configured',
//         500
//       );
//     }

//     try {

//       const formData = JSON.stringify({
//         title,
//         body,
//         type: 'event-badging'
//       });

//       const encryptedState =
//         this.cryptoService.encrypt(formData);

//       const url =
//         this.githubAuthService.getEventBadgingAuthUrl(
//           encryptedState
//         );

//       return {
//         data: url,
//         errors: [],
//       };

//     } catch (error: unknown) {

//       throw new AppError(
//         'Failed to generate event badging authorization URL',
//         500,
//         true,
//         error
//       );
//     }
//   }

//   /**
//    * GitHub OAuth callback
//    */
//   async handleGitHubCallback(
//     code: string,
//     state?: string
//   ): Promise<
//     IOperationResult<
//       IAuthCallbackResult | { issueUrl: string }
//     >
//   > {

//     const isEventBadging = !!state;

//     const {
//       access_token: accessToken,
//       errors: tokenErrors
//     } = await this.githubAuthService.requestAccessToken(
//       code,
//       isEventBadging
//     );

//     if (tokenErrors.length > 0 || !accessToken) {

//       throw new AppError(
//         tokenErrors.join(', ') || 'Failed to get access token',
//         401
//       );
//     }

//     try {

//       const userOctokit =
//         this.githubAuthService.createUserOctokit(accessToken);

//       const { data: user } =
//         await userOctokit.request('GET /user');

//       /**
//        * EVENT BADGING FLOW
//        */
//       if (state) {

//         const appOctokit =
//           await this.githubAppService.getInstallationOctokit(
//             Number(getEnvVar('GITHUB_APP_INSTALLATION_ID'))
//           );

//         return this.handleEventBadgingCallback(
//           appOctokit,
//           state,
//           user
//         );
//       }

//       /**
//        * PROJECT BADGING FLOW
//        */
//       return this.handleProjectBadgingCallback(userOctokit);

//     } catch (error: unknown) {

//       throw new AppError(
//         'GitHub authentication callback failed',
//         500,
//         true,
//         error
//       );
//     }
//   }

//   /**
//    * Event badging callback
//    */
//   private async handleEventBadgingCallback(
//     octokit: any,
//     encryptedState: string,
//     user: {
//       login: string;
//       html_url: string;
//     }
//   ): Promise<IOperationResult<{ issueUrl: string }>> {

//     try {

//       const formData =
//         this.cryptoService.decrypt(encryptedState);

//       const parsedFormData = JSON.parse(formData) as {
//         title: string;
//         body: string;
//       };

//       const baseMarkdown =
//         this.cryptoService.convertToMarkdown(
//           parsedFormData.body
//         );

//       const markdown = [
//         '### Submitted by',
//         `- GitHub: @${user.login}`,
//         `- Profile: ${user.html_url}`,
//         '',
//         '---',
//         '',
//         baseMarkdown
//       ].join('\n');

//       const result =
//         await this.githubApiService.createIssue(
//           octokit,
//           getEnvVar('REPOSITORY_OWNER'),
//           getEnvVar('REPOSITORY_NAME'),
//           parsedFormData.title,
//           markdown
//         );

//       if (result.errors.length > 0 || !result.data) {

//         throw new AppError(
//           result.errors.join(', ') ||
//             'Failed to create GitHub issue',
//           500
//         );
//       }

//       return {
//         data: {
//           issueUrl: result.data.url
//         },
//         errors: [],
//       };

//     } catch (error: unknown) {
//         throw new AppError(
//         'Failed to process event badging callback',
//         500,
//         true,
//         error
//       );
//     }
//   }

//   /**
//    * Project badging callback
//    */
//   private async handleProjectBadgingCallback(
//     octokit: Octokit
//   ): Promise<IOperationResult<IAuthCallbackResult>> {

//     const {
//       data: userInfo,
//       errors: userInfoErrors
//     } = await this.githubApiService.getUserInfo(octokit);

//     if (userInfoErrors.length > 0 || !userInfo) {

//       throw new AppError(
//         userInfoErrors.join(', ') ||
//           'Failed to retrieve GitHub user info',
//         500
//       );
//     }

//     const savedUser =
//       await this.userRepository.saveUser(
//         userInfo.login,
//         userInfo.name,
//         userInfo.email,
//         userInfo.id,
//         null
//       );

//     if (!savedUser) {

//       throw new AppError(
//         'Failed to save GitHub user',
//         500
//       );
//     }

//     const {
//       data: repositories,
//       errors: repoErrors
//     } = await this.githubApiService.getUserRepositories(
//       octokit
//     );

//     if (repoErrors.length > 0 || !repositories) {

//       throw new AppError(
//         repoErrors.join(', ') ||
//           'Failed to retrieve repositories',
//         500
//       );
//     }

//     return {
//       data: {
//         userId: savedUser.id,
//         name: savedUser.name,
//         username: savedUser.login,
//         email: savedUser.email,
//         repos: repositories,
//         provider: 'github',
//       },
//       errors: [],
//     };
//   }

//   /**
//    * GitLab OAuth callback
//    */
//   async handleGitLabCallback(
//     code: string
//   ): Promise<IOperationResult<IAuthCallbackResult>> {

//     const {
//       access_token: accessToken,
//       errors: tokenErrors
//     } = await this.gitlabAuthService.requestAccessToken(code);

//     if (tokenErrors.length > 0 || !accessToken) {

//       throw new AppError(
//         tokenErrors.join(', ') ||
//           'Failed to get GitLab access token',
//         401
//       );
//     }

//     const {
//       data: userInfo,
//       errors: userInfoErrors
//     } = await this.gitlabApiService.getUserInfo(accessToken);

//     if (userInfoErrors.length > 0 || !userInfo) {

//       throw new AppError(
//         userInfoErrors.join(', ') ||
//           'Failed to retrieve GitLab user info',
//         500
//       );
//     }

//     const savedUser =
//       await this.userRepository.saveUser(
//         userInfo.login,
//         userInfo.name,
//         userInfo.email,
//         null,
//         userInfo.id
//       );

//     if (!savedUser) {

//       throw new AppError(
//         'Failed to save GitLab user',
//         500
//       );
//     }

//     const {
//       data: repositories,
//       errors: repoErrors
//     } = await this.gitlabApiService.getUserRepositories(
//       accessToken
//     );

//     if (repoErrors.length > 0 || !repositories) {

//       throw new AppError(
//         repoErrors.join(', ') ||
//           'Failed to retrieve GitLab repositories',
//         500
//       );
//     }

//     return {
//       data: {
//         userId: savedUser.id,
//         name: savedUser.name,
//         username: savedUser.login,
//         email: savedUser.email,
//         repos: repositories,
//         provider: 'gitlab',
//       },
//       errors: [],
//     };
//   }
// }












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