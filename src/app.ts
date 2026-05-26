import 'reflect-metadata';
import { createExpressServer, useContainer } from 'routing-controllers';
import { Container } from 'typedi';
import express, { Express } from 'express';
import path from 'path';

import { AuthController } from './auth/controllers';
import { ProjectBadgingController } from './project-badging/controllers';
import { EventBadgingController } from './event-badging/controllers';
import { SystemController } from './shared/controllers';

import { requestLogger, globalErrorHandler} from './middleware'

useContainer(Container);



export function createApp(): Express {

  const app: Express = createExpressServer({
    controllers: [AuthController, ProjectBadgingController, EventBadgingController, SystemController],
    cors: true,
    defaultErrorHandler: false,
    routePrefix: '',
  }) as Express;

app.use(requestLogger);

app.use('/assets', express.static(path.join(__dirname, '../assets')));


  app.use(globalErrorHandler);

  return app;
}
