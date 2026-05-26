import { AuthService } from '../../../src/auth/services/auth.service';
import * as envConfig from '../../../src/shared/config/environment';
import {
  createMockGitHubAuthService,
  createMockGitHubApiService,
  createMockGitHubAppService,
} from '../../mocks/github.mock';

import {
  createMockGitLabAuthService,
  createMockGitLabApiService,
} from '../../mocks/gitlab.mock';

import { createMockUserRepository } from '../../mocks/repository.mock';
import { createMockCryptoService } from '../../mocks/crypto.mock';

describe('AuthService', () => {
  let authService: AuthService;
  let mockGitHubAuthService: ReturnType<typeof createMockGitHubAuthService>;
  let mockGitHubApiService: ReturnType<typeof createMockGitHubApiService>;
  let mockGitHubAppService: ReturnType<typeof createMockGitHubAppService>;
  let mockGitLabAuthService: ReturnType<typeof createMockGitLabAuthService>;
  let mockGitLabApiService: ReturnType<typeof createMockGitLabApiService>;
  let mockUserRepository: ReturnType<typeof createMockUserRepository>;
  let mockCryptoService: ReturnType<typeof createMockCryptoService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGitHubAuthService = createMockGitHubAuthService();
    mockGitHubApiService = createMockGitHubApiService();
    mockGitHubAppService = createMockGitHubAppService();
    mockGitLabAuthService = createMockGitLabAuthService();
    mockGitLabApiService = createMockGitLabApiService();
    mockUserRepository = createMockUserRepository();
    mockCryptoService = createMockCryptoService();

    authService = new AuthService(
      mockGitHubAuthService as any,
      mockGitHubAppService as any,
      mockGitHubApiService as any,
      mockGitLabAuthService as any,
      mockGitLabApiService as any,
      mockUserRepository as any,
      mockCryptoService as any
    );
  });

  describe('getLoginUrl', () => {
    it('should return GitHub login URL if configured', () => {
      mockGitHubAuthService.isConfigured.mockReturnValue(true);
      mockGitHubAuthService.getProjectBadgingAuthUrl.mockReturnValue('https://github.com/login/oauth');

      const result = authService.getLoginUrl('github');
      expect(result.data).toBe('https://github.com/login/oauth');
      expect(result.errors).toHaveLength(0);
    });

    it('should fail if GitHub is not configured', () => {
      mockGitHubAuthService.isConfigured.mockReturnValue(false);

      expect(() => authService.getLoginUrl('github')).toThrow(
        'GitHub provider is not configured'
      );
    });

    it('should return GitLab login URL if configured', () => {
      mockGitLabAuthService.isConfigured.mockReturnValue(true);
      mockGitLabAuthService.getAuthUrl.mockReturnValue('https://gitlab.com/oauth/authorize');

      const result = authService.getLoginUrl('gitlab');
      expect(result.data).toBe('https://gitlab.com/oauth/authorize');
      expect(result.errors).toHaveLength(0);
    });

    it('should fail if GitLab is not configured', () => {
      mockGitLabAuthService.isConfigured.mockReturnValue(false);

      expect(() => authService.getLoginUrl('gitlab')).toThrow(
        'GitLab provider is not configured'
      );
    });

    it('should return error for unknown provider', () => {
      expect(() => authService.getLoginUrl('bitbucket' as any)).toThrow(
        'Unknown provider: bitbucket'
      );
    });
  });


  describe('getEventBadgingAuthUrl', () => {
    it('should return error if event badging is not configured', () => {
      mockGitHubAuthService.isEventBadgingConfigured.mockReturnValue(false);

      expect(() => authService.getEventBadgingAuthUrl('Test Event', 'Test body')).toThrow(
        'GitHub event badging provider is not configured'
      );
    });

    it('should return event badging auth URL when configured', () => {
      mockGitHubAuthService.isEventBadgingConfigured.mockReturnValue(true);

      mockCryptoService.encrypt.mockReturnValue('encrypted-state');

      mockGitHubAuthService.getEventBadgingAuthUrl.mockReturnValue(
        'https://github.com/oauth/event'
      );

      const result = authService.getEventBadgingAuthUrl('Test Event', 'Test body');

      expect(mockCryptoService.encrypt).toHaveBeenCalled();
      expect(mockGitHubAuthService.getEventBadgingAuthUrl).toHaveBeenCalledWith(
        'encrypted-state'
      );

      expect(result.data).toBe('https://github.com/oauth/event');
      expect(result.errors).toHaveLength(0);
    });
  });


  describe('handleGitHubCallback', () => {
    it('should return error if token exchange fails', async () => {
      mockGitHubAuthService.requestAccessToken.mockResolvedValue({
        access_token: null,
        errors: ['token failed'],
      });

      await expect(authService.handleGitHubCallback('code123')).rejects.toThrow('token failed');
    });

    it('should return user and repositories for project badging flow', async () => {
      mockGitHubAuthService.requestAccessToken.mockResolvedValue({
        access_token: 'mock-token',
        errors: [],
      });

      mockGitHubAuthService.createUserOctokit.mockReturnValue({
        request: jest.fn().mockResolvedValue({
          data: { login: 'aj', html_url: 'https://github.com/aj' },
        }),
      } as any);

      mockGitHubApiService.getUserInfo.mockResolvedValue({
        data: {
          login: 'aj',
          name: 'AJ',
          email: 'aj@test.com',
          id: 123,
        },
        errors: [],
      });

      mockUserRepository.saveUser.mockResolvedValue({
        id: 1,
        login: 'aj',
        name: 'AJ',
        email: 'aj@test.com',
      });

      mockGitHubApiService.getUserRepositories.mockResolvedValue({
        data: [{ name: 'repo1' }, { name: 'repo2' }],
        errors: [],
      });

      const result = await authService.handleGitHubCallback('code123');

      expect(result.errors).toHaveLength(0);

      if (result.data && 'provider' in result.data) {
        expect(result.data.provider).toBe('github');
        expect(result.data.repos.length).toBe(2);
      } else {
        fail('Expected project badging result');
      }
    });

    it('should create issue for event badging callback', async () => {
      mockGitHubAuthService.requestAccessToken.mockResolvedValue({
        access_token: 'mock-token',
        errors: [],
      });

      mockGitHubAuthService.createUserOctokit.mockReturnValue({
        request: jest.fn().mockResolvedValue({
          data: { login: 'aj', html_url: 'https://github.com/aj' },
        }),
      } as any);

      mockGitHubAppService.getInstallationOctokit.mockResolvedValue({} as any);

      jest.spyOn(envConfig, 'getEnvVar').mockImplementation((key: unknown) => {
        const k = key as string;
        if (k === 'GITHUB_APP_INSTALLATION_ID') return '12345';
        if (k === 'REPOSITORY_OWNER') return 'badging';
        if (k === 'REPOSITORY_NAME') return 'badging';
        return 'value';
      });

      mockCryptoService.decrypt.mockReturnValue(
        JSON.stringify({
          title: 'Event Title',
          body: 'Event Body',
        })
      );

      mockCryptoService.convertToMarkdown.mockReturnValue('markdown body');

      mockGitHubApiService.createIssue.mockResolvedValue({
        data: { url: 'https://github.com/issue/1' },
        errors: [],
      });

      const result = await authService.handleGitHubCallback(
        'code123',
        'encrypted-state'
      );

      expect(result.errors).toHaveLength(0);

      expect(result.data).toEqual({
        issueUrl: 'https://github.com/issue/1',
      });
    });
  });

  describe('handleGitLabCallback', () => {
    it('should return error if token exchange fails', async () => {
      mockGitLabAuthService.requestAccessToken.mockResolvedValue({
        access_token: null,
        errors: ['token failed'],
      });

      await expect(authService.handleGitLabCallback('code')).rejects.toThrow('token failed');
    });

    it('should return user and repositories for GitLab login', async () => {
      mockGitLabAuthService.requestAccessToken.mockResolvedValue({
        access_token: 'token',
        errors: [],
      });

      mockGitLabApiService.getUserInfo.mockResolvedValue({
        data: {
          login: 'gitlabuser',
          name: 'GitLab User',
          email: 'user@gitlab.com',
          id: 999,
        },
        errors: [],
      });

      mockUserRepository.saveUser.mockResolvedValue({
        id: 2,
        login: 'gitlabuser',
        name: 'GitLab User',
        email: 'user@gitlab.com',
      });

      mockGitLabApiService.getUserRepositories.mockResolvedValue({
        data: [{ name: 'repoA' }],
        errors: [],
      });

      const result = await authService.handleGitLabCallback('code');

      expect(result.errors).toHaveLength(0);

      expect(result.data?.provider).toBe('gitlab');

      expect(result.data?.repos.length).toBe(1);
    });
  });
});