import { AuthService } from '../../../src/auth/services/auth.service';
import {
  mockGitHubAuthService,
  mockGitHubApiService,
} from '../../mocks/github.mock';

import {
  mockGitLabAuthService,
  mockGitLabApiService,
} from '../../mocks/gitlab.mock';

import { mockUserRepository } from '../../mocks/repository.mock';
import { mockCryptoService } from '../../mocks/crypto.mock';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    jest.clearAllMocks(); 

    authService = new AuthService(
      mockGitHubAuthService as any,
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

      const result = authService.getLoginUrl('github');
      expect(result.data).toBeNull();
      expect(result.errors).toContain('GitHub provider is not configured');
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

      const result = authService.getLoginUrl('gitlab');
      expect(result.data).toBeNull();
      expect(result.errors).toContain('GitLab provider is not configured');
    });

    it('should return error for unknown provider', () => {
      const result = authService.getLoginUrl('bitbucket' as any);
      expect(result.data).toBeNull();
      expect(result.errors).toContain('Unknown provider: bitbucket');
    });
  });


  describe('getEventBadgingAuthUrl', () => {
  it('should return error if event badging is not configured', () => {
    mockGitHubAuthService.isEventBadgingConfigured.mockReturnValue(false);

    const result = authService.getEventBadgingAuthUrl('Test Event', 'Test body');

    expect(result.data).toBeNull();
    expect(result.errors).toContain('GitHub event badging provider is not configured');
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

    const result = await authService.handleGitHubCallback('code123');

    expect(result.data).toBeNull();
    expect(result.errors).toContain('token failed');
  });
});

it('should return user and repositories for project badging flow', async () => {
  mockGitHubAuthService.requestAccessToken.mockResolvedValue({
    access_token: 'mock-token',
    errors: [],
  });

  mockGitHubAuthService.createOctokit.mockReturnValue({} as any);

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

it('should return user and repositories for project badging flow', async () => {
  mockGitHubAuthService.requestAccessToken.mockResolvedValue({
    access_token: 'mock-token',
    errors: [],
  });

  mockGitHubAuthService.createOctokit.mockReturnValue({} as any);

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

  mockGitHubAuthService.createOctokit.mockReturnValue({} as any);

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

describe('handleGitLabCallback', () => {
  it('should return error if token exchange fails', async () => {
    mockGitLabAuthService.requestAccessToken.mockResolvedValue({
      access_token: null,
      errors: ['token failed'],
    });

    const result = await authService.handleGitLabCallback('code');

    expect(result.data).toBeNull();
    expect(result.errors).toContain('token failed');
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