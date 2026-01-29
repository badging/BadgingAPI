import 'reflect-metadata';
import 'dotenv/config';
import SmeeClient from 'smee-client';
import { createApp } from './app';
import { Database } from './shared/data-access/database';
import { Container } from 'typedi';
import { getEnvVar, isDevelopment } from './shared/config/environment';

async function bootstrap(): Promise<void> {
  const PORT = parseInt(getEnvVar('PORT', '5000'), 10);
  const APP_URL = getEnvVar('APP_URL', `http://localhost:${PORT}`);

  try {
    // Initialize database
    console.log('Connecting to database...');
    const database = Container.get(Database);
    await database.connect();
    console.log('Database connected successfully');

    // Create and configure Express app
    const app = createApp();

    // Setup Smee.io for webhook forwarding in development
    if (isDevelopment()) {
      const SMEE_WEBHOOK_URL = getEnvVar('SMEE_WEBHOOK_URL', '');
      if (SMEE_WEBHOOK_URL) {
        const smee = new SmeeClient({
          source: SMEE_WEBHOOK_URL,
          target: `${APP_URL}/api/event_badging`,
          logger: console,
        });

        const events = smee.start();
        console.log(`Smee client forwarding from ${SMEE_WEBHOOK_URL}`);

        // Handle cleanup on exit
        process.on('SIGINT', () => {
          events.close();
          process.exit(0);
        });

        process.on('SIGTERM', () => {
          events.close();
          process.exit(0);
        });
      }
    }

    // Start server
    app.listen(PORT, () => {
      console.log(`DEI Badging API server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`App URL: ${APP_URL}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
bootstrap().catch((error) => {
  console.error('Bootstrap error:', error);
  process.exit(1);
});
