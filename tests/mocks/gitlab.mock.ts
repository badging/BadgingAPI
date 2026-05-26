export const createMockGitLabAuthService = () => ({
  isConfigured: jest.fn(),
  getAuthUrl: jest.fn(),
  requestAccessToken: jest.fn(),
});

export const createMockGitLabApiService = () => ({
  getUserInfo: jest.fn(),
  getUserRepositories: jest.fn(),
});