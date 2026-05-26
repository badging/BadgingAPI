import { Service } from 'typedi';
import { Octokit } from '@octokit/rest';
import axios from 'axios';
import { getEnvVar } from '../../config/environment';
import { logger } from '../../logger';
import { IOAuthTokenResponse } from '../../types';

export interface IGitHubAuthConfig {
  clientId: string;
  clientSecret: string;
  scopes: string[];
}

@Service()
export class GitHubAuthService {
  /**
   * Get authorization URL for project badging OAuth flow
   */
  getProjectBadgingAuthUrl(): string {
    const clientId = getEnvVar('GITHUB_AUTH_CLIENT_ID');
    const scopes = ['read:user', 'user:email'];

    return `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=${scopes.join(',')}`;
  }

  /**
   * Get authorization URL for event badging OAuth flow with state
   */
  getEventBadgingAuthUrl(encryptedState: string): string {
    const clientId = getEnvVar('GITHUB_AUTH_CLIENT_ID_EVENT');
    const scopes = ['read:user', 'user:email'];

    return `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=${scopes.join(',')}&state=${encryptedState}`;
  }

  /**
   * Exchange OAuth code for access token
   */
  async requestAccessToken(code: string, isEventBadging = false): Promise<IOAuthTokenResponse> {
    try {
      const clientId = isEventBadging
        ? getEnvVar('GITHUB_AUTH_CLIENT_ID_EVENT')
        : getEnvVar('GITHUB_AUTH_CLIENT_ID');

      const clientSecret = isEventBadging
        ? getEnvVar('GITHUB_AUTH_CLIENT_SECRET_EVENT')
        : getEnvVar('GITHUB_AUTH_CLIENT_SECRET');

      const {
        data: { access_token },
      } = await axios.post<{ access_token: string }>(
        'https://github.com/login/oauth/access_token',
        {
          client_id: clientId,
          client_secret: clientSecret,
          code,
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
      logger.error('Failed to exchange GitHub OAuth code', {
        error: error instanceof Error ? error.message : 'Unknown error',
        isEventBadging,
      });

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        access_token: '',
        errors: [errorMessage],
      };
    }
  }

  /**
   * Create an Octokit instance with the given access token
   */
  createUserOctokit(accessToken: string): Octokit {
    return new Octokit({ auth: accessToken });
  }

  /**
   * Create an unauthenticated Octokit instance
   */
  createPublicOctokit(): Octokit {
    return new Octokit();
  }

  /**
   * Check if GitHub provider is configured
   */
  isConfigured(): boolean {
    try {
      getEnvVar('GITHUB_AUTH_CLIENT_ID');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if GitHub event badging provider is configured
   */
  isEventBadgingConfigured(): boolean {
    try {
      getEnvVar('GITHUB_AUTH_CLIENT_ID_EVENT');
      return true;
    } catch {
      return false;
    }
  }
}
