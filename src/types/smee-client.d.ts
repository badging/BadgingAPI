import SmeeClient from 'smee-client';
import logger from '../shared/logger';
import { getEnvVar } from '../shared/config/environment';

export function startSmee(appUrl: string, webhookPath: string): () => void {
  const SMEE_WEBHOOK_URL = getEnvVar('SMEE_WEBHOOK_URL', '');
  if (!SMEE_WEBHOOK_URL) return () => {};

  const smee = new SmeeClient({
    source: SMEE_WEBHOOK_URL,
    target: `${appUrl}${webhookPath}`,
    logger,
  });

  const events = smee.start();
  logger.info('Smee forwarding enabled', {
    source: SMEE_WEBHOOK_URL,
    target: webhookPath,
  });

  return () => {
    events.close();
    logger.info('Smee forwarding stopped');
  };
}
