import 'reflect-metadata';
import 'dotenv/config';
import { createApp } from './app';
import { initializeDatabase } from './shared/data-access/database.bootstrap';
import { startSmee } from './dev/smee';
import { getEnvVar, isDevelopment } from './shared/config/environment';
import {logger} from './shared/logger';

async function bootstrap(): Promise<void> {
  const PORT = parseInt(getEnvVar('PORT', '5000'), 10);
  const APP_URL = getEnvVar('APP_URL', `http://localhost:${PORT}`);
  const WEBHOOK_PATH = getEnvVar('WEBHOOK_PATH', '/api/event_badging');

  await initializeDatabase();

  const app = createApp();

  let stopSmee = () => {};
  if (isDevelopment()) {
    stopSmee = startSmee(APP_URL, WEBHOOK_PATH);
  }

  const server = app.listen(PORT, () => {
    logger.info('Server started at', { url: APP_URL });
  });

  const shutdown = () => {
    stopSmee();
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  logger.error('Fatal startup error', { err });
  process.exit(1);
});
