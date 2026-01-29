import { Service } from 'typedi';
import axios from 'axios';
import { getEnvVar } from '../../config/environment';
import { IOAuthTokenResponse } from '../../types';

@Service()
export class GitLabAuthService {
  /**
   * Get authorization URL for GitLab OAuth flow
   */
  getAuthUrl(): string {
    const clientId = getEnvVar('GITLAB_APP_CLIENT_ID');
    const redirectUri = getEnvVar('GITLAB_APP_REDIRECT_URI');
    const scopes = ['read_api'];

    return `https://gitlab.com/oauth/authorize?client_id=${clientId}&response_type=code&state=STATE&scope=${scopes.join('+')}&redirect_uri=${redirectUri}`;
  }

  /**
   * Exchange OAuth code for access token
   */
  async requestAccessToken(code: string): Promise<IOAuthTokenResponse> {
    try {
      const clientId = getEnvVar('GITLAB_APP_CLIENT_ID');
      const clientSecret = getEnvVar('GITLAB_APP_CLIENT_SECRET');
      const redirectUri = getEnvVar('GITLAB_APP_REDIRECT_URI');

      const {
        data: { access_token },
      } = await axios.post<{ access_token: string }>(
        'https://gitlab.com/oauth/token',
        {
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        },
        {
          headers: {
            Accept: 'application/json',
          },
        }
      );

      return {
        access_token,
        errors: [],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        access_token: '',
        errors: [errorMessage],
      };
    }
  }

  /**
   * Check if GitLab provider is configured
   */
  isConfigured(): boolean {
    try {
      getEnvVar('GITLAB_APP_CLIENT_ID');
      return true;
    } catch {
      return false;
    }
  }
}
