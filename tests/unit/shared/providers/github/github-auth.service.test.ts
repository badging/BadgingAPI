import axios from 'axios';
import { GitHubAuthService } from '../../../../../src/shared/providers/github/github-auth.service';
import * as envConfig from '../../../../../src/shared/config/environment';
import { Octokit } from '@octokit/rest';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('GitHubAuthService', () => {
  let service: GitHubAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GitHubAuthService();
  });

  describe('URL Generation', () => {
    test('getProjectBadgingAuthUrl() should build valid URL with project scopes', () => {
      jest.spyOn(envConfig, 'getEnvVar').mockReturnValue('project_id');
      
      const url = service.getProjectBadgingAuthUrl();
      
      expect(url).toContain('client_id=project_id');
      expect(url).toContain('scope=read:user,user:email,public_repo');
    });

    test('getEventBadgingAuthUrl() should include encrypted state and event client id', () => {
      jest.spyOn(envConfig, 'getEnvVar').mockReturnValue('event_id');
      
      const url = service.getEventBadgingAuthUrl('my-secret-state');
      
      expect(url).toContain('client_id=event_id');
      expect(url).toContain('state=my-secret-state');
      expect(url).toContain('scope=public_repo');
    });
  });


  describe('requestAccessToken', () => {
    test('should exchange code for token successfully', async () => {
      jest.spyOn(envConfig, 'getEnvVar').mockReturnValue('secret_val');
      mockedAxios.post.mockResolvedValue({
        data: { access_token: 'gho_12345' }
      });

      const result = await service.requestAccessToken('auth_code');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ code: 'auth_code' }),
        expect.any(Object)
      );
      expect(result.access_token).toBe('gho_12345');
      expect(result.errors).toHaveLength(0);
    });

    test('should use Event credentials when isEventBadging is true', async () => {
      const envSpy = jest.spyOn(envConfig, 'getEnvVar').mockReturnValue('val');
      mockedAxios.post.mockResolvedValue({ data: { access_token: 't' } });

      await service.requestAccessToken('code', true);

      expect(envSpy).toHaveBeenCalledWith('GITHUB_AUTH_CLIENT_ID_EVENT');
      expect(envSpy).toHaveBeenCalledWith('GITHUB_AUTH_CLIENT_SECRET_EVENT');
    });

    test('should catch axios errors and return error message', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network Error'));

      const result = await service.requestAccessToken('code');

      expect(result.access_token).toBe('');
      expect(result.errors).toContain('Network Error');
    });
  });


  describe('Configuration State', () => {
    test('isConfigured() should return true if env var exists', () => {
      jest.spyOn(envConfig, 'getEnvVar').mockReturnValue('exists');
      expect(service.isConfigured()).toBe(true);
    });

    test('isConfigured() should return false if getEnvVar throws', () => {
      jest.spyOn(envConfig, 'getEnvVar').mockImplementation(() => {
        throw new Error('Not found');
      });
      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('Octokit Factory', () => {
    test('createOctokit() should return instance with auth header', () => {
      const octokit = service.createOctokit('my_token');
      expect(octokit).toBeInstanceOf(Octokit);
    });

    test('createPublicOctokit() should return instance', () => {
      const octokit = service.createPublicOctokit();
      expect(octokit).toBeInstanceOf(Octokit);
    });
  });
});