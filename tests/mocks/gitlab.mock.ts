
export const mockGitLabAuthService = {
  isConfigured: jest.fn(),
  getAuthUrl: jest.fn(),
  requestAccessToken: jest.fn(),
};

export const mockGitLabApiService = {
  getUserInfo: jest.fn(),
  getUserRepositories: jest.fn(),
};