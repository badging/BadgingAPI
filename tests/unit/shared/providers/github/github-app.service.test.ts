jest.mock('octokit', () => ({
  App: jest.fn(),
}));

import { GitHubAppService } from '../../../../../src/shared/providers/github/github-app.service';
import * as envConfig from '../../../../../src/shared/config/environment';
import { App } from 'octokit';
import { createMockGitHubAppInstance } from '../../../../mocks/github.mock';
import { logger } from '../../../../../src/shared/logger';

const MockedApp = App as unknown as jest.Mock;

describe('GitHubAppService', () => {
  let service: GitHubAppService;
  let mockGitHubAppInstance: ReturnType<typeof createMockGitHubAppInstance>;

  const mockValidEnv = () => {
    jest.spyOn(envConfig, 'getEnvVar').mockImplementation((key: string) => {
      const vars: Record<string, string> = {
        GITHUB_APP_ID: '123',
        GITHUB_APP_PRIVATE_KEY: '-----BEGIN RSA PRIVATE KEY-----\\nkey\\n-----END...',
        GITHUB_APP_CLIENT_ID: 'client_id',
        GITHUB_APP_CLIENT_SECRET: 'secret',
        GITHUB_APP_WEBHOOK_SECRET: 'webhook_secret',
      };
      return vars[key];
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    mockGitHubAppInstance = createMockGitHubAppInstance();
    MockedApp.mockReturnValue(mockGitHubAppInstance);
  });

  afterEach(() => {
  jest.restoreAllMocks();
});

  test('should initialize successfully when all env vars are present', () => {
    mockValidEnv();

    service = new GitHubAppService();

    expect(service.isConfigured()).toBe(true);

    expect(service.getApp()).toBe(mockGitHubAppInstance);

    expect(App).toHaveBeenCalledWith(
      expect.objectContaining({
        privateKey: expect.stringContaining('\n'),
      })
    );
  });

  test('getInstallationOctokit() should return an octokit instance', async () => {
    mockValidEnv();

    const mockOctokit = { request: jest.fn() };
    mockGitHubAppInstance.getInstallationOctokit.mockResolvedValue(mockOctokit);

    service = new GitHubAppService();

    const result = await service.getInstallationOctokit(12345);

    expect(mockGitHubAppInstance.getInstallationOctokit).toHaveBeenCalledWith(12345);
    expect(result).toBe(mockOctokit);
  });

    test('should fail to initialize if an env var is missing', () => {
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => logger);

    jest.spyOn(envConfig, 'getEnvVar').mockImplementation((key) =>
      key === 'GITHUB_APP_ID' ? '' : 'some-value'
    );

    service = new GitHubAppService();

    expect(service.isConfigured()).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('not fully configured')
    );

    warnSpy.mockRestore();
  });

  test('getInstallationOctokit() should throw error if app is not configured', async () => {
    jest.spyOn(envConfig, 'getEnvVar').mockReturnValue('');

    service = new GitHubAppService();

    await expect(service.getInstallationOctokit(123))
      .rejects.toThrow('GitHub App is not configured');
  });

  test('should catch and log errors during App instantiation', () => {
    mockValidEnv();

    MockedApp.mockImplementationOnce(() => {
      throw new Error('Invalid Private Key Format');
    });

    expect(() => new GitHubAppService()).toThrow('GitHub App initialization failed');
  });
});