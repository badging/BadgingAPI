export const createMockGitHubAuthService = () => ({
  isConfigured: jest.fn(),
  getProjectBadgingAuthUrl: jest.fn(),
  requestAccessToken: jest.fn(),
  createUserOctokit: jest.fn(),
  createPublicOctokit: jest.fn(),
  getEventBadgingAuthUrl: jest.fn(),
  isEventBadgingConfigured: jest.fn(),
});

export const createMockGitHubApiService = () => ({
  createIssue: jest.fn(),
  listIssueComments: jest.fn(),
  getUserInfo: jest.fn(),
  getUserRepositories: jest.fn(),
  getRepoContent: jest.fn(),
});

export const createMockGitHubAppService = () => ({
  isConfigured: jest.fn(),
  getApp: jest.fn(),
  getInstallationOctokit: jest.fn(),
});

export const createMockGitHubAppInstance = () => ({
  getInstallationOctokit: jest.fn().mockResolvedValue({}),
});

