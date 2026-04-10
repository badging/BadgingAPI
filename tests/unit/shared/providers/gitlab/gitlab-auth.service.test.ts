import axios from 'axios';
import { GitLabAuthService } from '../../../../../src/shared/providers/gitlab/gitlab-auth.service';
import * as envConfig from '../../../../../src/shared/config/environment';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('GitLabAuthService', () => {
  let service: GitLabAuthService;

  const mockEnv: { [key: string]: string } = {
    GITLAB_APP_CLIENT_ID: 'client-123',
    GITLAB_APP_CLIENT_SECRET: 'secret-456',
    GITLAB_APP_REDIRECT_URI: 'http://localhost/callback',
  };

  beforeEach(() => {
    service = new GitLabAuthService();
    jest.clearAllMocks();
    
    jest.spyOn(envConfig, 'getEnvVar').mockImplementation((key: string) => {
      const value = mockEnv[key];
      if (value) return value;
      throw new Error(`Env var ${key} not set`);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });


  test('getAuthUrl() should construct the correct GitLab OAuth URL', () => {
    const url = service.getAuthUrl();

    expect(url).toBe(
      'https://gitlab.com/oauth/authorize?client_id=client-123&response_type=code&state=STATE&scope=read_api&redirect_uri=http://localhost/callback'
    );
  });

  test('requestAccessToken() should exchange code for token successfully', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { access_token: 'glpat-valid-token' }
    });

    const result = await service.requestAccessToken('valid-code');

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://gitlab.com/oauth/token',
      {
        client_id: 'client-123',
        client_secret: 'secret-456',
        code: 'valid-code',
        grant_type: 'authorization_code',
        redirect_uri: 'http://localhost/callback',
      },
      { headers: { Accept: 'application/json' } }
    );
    expect(result.access_token).toBe('glpat-valid-token');
    expect(result.errors).toHaveLength(0);
  });

  test('isConfigured() should return true when client ID is available', () => {
    expect(service.isConfigured()).toBe(true);
  });

  test('requestAccessToken() should return errors on API failure', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Internal Server Error'));

    const result = await service.requestAccessToken('any-code');

    expect(result.access_token).toBe('');
    expect(result.errors).toContain('Internal Server Error');
  });

  test('isConfigured() should return false if getEnvVar throws', () => {
    jest.spyOn(envConfig, 'getEnvVar').mockImplementation(() => {
      throw new Error('Missing Config');
    });

    expect(service.isConfigured()).toBe(false);
  });

  test('requestAccessToken() should handle non-standard error objects', async () => {
    mockedAxios.post.mockRejectedValueOnce('Unexpected Error String');

    const result = await service.requestAccessToken('code');

    expect(result.errors).toContain('Unknown error');
  });
});