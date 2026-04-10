import 'reflect-metadata';
import { createExpressServer, useContainer } from 'routing-controllers';
import { Container } from 'typedi';
import express, { Express } from 'express';
import path from 'path';

// Import controllers
import { AuthController } from './auth/controllers';
import { ProjectBadgingController } from './project-badging/controllers';
import { EventBadgingController } from './event-badging/controllers';
import { SystemController } from './shared/controllers';

// Set container for routing-controllers
useContainer(Container);

/**
 * Create and configure Express application
 */
export function createApp(): Express {
  // Create express server with routing-controllers
  const app: Express = createExpressServer({
    controllers: [AuthController, ProjectBadgingController, EventBadgingController, SystemController],
    cors: true,
    defaultErrorHandler: false,
    routePrefix: '',
  }) as Express;

  // Serve static files
  app.use('/assets', express.static(path.join(__dirname, '../assets')));

  return app;
}
