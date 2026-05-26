import { JsonController, Get } from 'routing-controllers';
import { Service } from 'typedi';

@JsonController()
@Service()
export class SystemController {
  
  @Get('/health')
  healthCheck() {
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString() 
    };
  }

  @Get('/')
  root() {
    return {
      name: 'DEI Badging API',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        auth: {
          github: '/api/callback',
          gitlab: '/api/gitlab/callback',
        },
        // ... rest of your metadata
      },
    };
  }
}