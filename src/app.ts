import 'reflect-metadata';
import { createExpressServer, useContainer } from 'routing-controllers';
import { Container } from 'typedi';
import express, { Express, Request, Response } from 'express';
import path from 'path';

// Import controllers
import { AuthController } from './auth/controllers';
import { ProjectBadgingController } from './project-badging/controllers';
import { EventBadgingController } from './event-badging/controllers';

// Set container for routing-controllers
useContainer(Container);

/**
 * Create and configure Express application
 */
export function createApp(): Express {
  // Create express server with routing-controllers
  const app: Express = createExpressServer({
    controllers: [AuthController, ProjectBadgingController, EventBadgingController],
    cors: true,
    defaultErrorHandler: true,
    routePrefix: '',
  }) as Express;

  // Additional middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve static files
  app.use('/assets', express.static(path.join(__dirname, '../assets')));

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API base endpoint (for compatibility)
  app.get('/api', (_req: Request, res: Response) => {
    res.json({ message: 'Project Badging server up and running' });
  });

  // Root endpoint
  app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
      name: 'DEI Badging API',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        auth: {
          github: '/api/callback',
          gitlab: '/api/gitlab/callback',
        },
        projectBadging: {
          badgedRepos: '/api/badgedRepos',
          reposToBadge: '/api/repos-to-badge',
        },
        eventBadging: {
          webhook: '/api/event_badging',
          badgedEvents: '/api/badged_events',
        },
      },
    });
  });

  return app;
}
