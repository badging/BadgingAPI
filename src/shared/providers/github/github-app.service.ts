import { Service } from 'typedi';
import { App, Octokit } from 'octokit';
import { getEnvVar } from '../../config/environment';
import { logger } from '../../logger';

@Service()
export class GitHubAppService {
  private app: App | null = null;

  constructor() {
    this.initializeApp();
  }

  private initializeApp(): void {
    try {
      const appId = getEnvVar('GITHUB_APP_ID', false);
      const privateKey = getEnvVar('GITHUB_APP_PRIVATE_KEY', false);
      const clientId = getEnvVar('GITHUB_APP_CLIENT_ID', false);
      const clientSecret = getEnvVar('GITHUB_APP_CLIENT_SECRET', false);
      const webhookSecret = getEnvVar('GITHUB_APP_WEBHOOK_SECRET', false);

      if (!appId || !privateKey || !clientId || !clientSecret || !webhookSecret) {
        logger.warn('GitHub App is not fully configured - webhook handling will be disabled');
        return;
      }

      this.app = new App({
        appId,
        privateKey: privateKey.replace(/\\n/g, '\n'),
        oauth: {
          clientId,
          clientSecret,
        },
        webhooks: { secret: webhookSecret },
      });
    } catch (error) {
      throw new Error('GitHub App initialization failed');
    }
  }

  /**
   * Check if GitHub App is configured and available
   */
  isConfigured(): boolean {
    return this.app !== null;
  }

  /**
   * Get the GitHub App instance
   */
  getApp(): App | null {
    return this.app;
  }

  /**
   * Get an Octokit instance for a specific installation
   */
  async getInstallationOctokit(installationId: number): Promise<Octokit> {
    if (!this.app) {
      throw new Error('GitHub App is not configured');
    }

    return this.app.getInstallationOctokit(installationId);
  }
}
