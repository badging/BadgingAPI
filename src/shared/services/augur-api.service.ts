import { Service } from 'typedi';
import axios from 'axios';
import { getEnvVar } from '../config/environment';
import { logger } from '../logger';

@Service()
export class AugurApiService {
  private readonly apiUrl = 'https://projectbadge.chaoss.io/api/unstable/dei/repo/add';

  /**
   * Register a badged repository with the Augur API
   */
  async registerBadgedRepo(id: number, level: string, url: string): Promise<unknown | null> {
    const apiKey = getEnvVar('AUGUR_API_KEY', false);
    const clientSecret = getEnvVar('AUGUR_APP_CLIENT_SECRET', false);

    if (!clientSecret) {
      logger.error('AUGUR_APP_CLIENT_SECRET not provided');
      return null;
    }

    if (!apiKey) {
      logger.error('AUGUR_API_KEY not provided');
      return null;
    }

    try {
      const response = await axios.post(
        `${this.apiUrl}?id=${id}&level=${level}&url=${encodeURIComponent(url)}`,
        {},
        {
          headers: {
            Authorization: `Client ${apiKey}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error calling Augur API:', { error: errorMessage });
      return null;
    }
  }
}
