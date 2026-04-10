export const mockGitHubAuthService = {
  isConfigured: jest.fn(),
  getProjectBadgingAuthUrl: jest.fn(),
  requestAccessToken: jest.fn(),
  createOctokit: jest.fn(),
  getEventBadgingAuthUrl: jest.fn(),
  isEventBadgingConfigured: jest.fn(),
};

export const mockGitHubApiService = {
  createIssue: jest.fn(),
  listIssueComments: jest.fn(),
  getUserInfo: jest.fn(),
  getUserRepositories: jest.fn(),
  getRepoContent: jest.fn(),
};

export const mockGitHubAppInstance = {
  getInstallationOctokit: jest.fn().mockResolvedValue({}),
};

