import {
  JsonController,
  Post,
  Body,
  HeaderParam,
  Get,
  Res,
} from 'routing-controllers';
import { Service } from 'typedi';
import { Response } from 'express';

import { EventBadgingService } from '../services/event-badging.service';
import { EventRepository } from '../../shared/data-access/repositories/event.repository';
import { IGitHubWebhookPayload } from '../../shared/types';

import { AppError } from '../../shared/errors'; 
import { logger } from '../../shared/logger';



@JsonController('/api')
@Service()
export class EventBadgingController {
  constructor(
    private eventBadgingService: EventBadgingService,
    private eventRepository: EventRepository
  ) {}

  /**
   * POST /api/event_badging
   */
  @Post('/event_badging')
  async handleWebhook(
    @Body() payload: IGitHubWebhookPayload,
    @HeaderParam('x-github-event') eventName: string,
    @Res() response: Response
  ): Promise<Response> {

    if (!eventName) {
      throw new AppError('GitHub event header missing', 400);
    }

    logger.info('Received GitHub webhook event', {
      eventName,
      action: payload?.action,
    });

    await this.eventBadgingService.processWebhook(eventName, payload);

    return response.send('ok');
  }

  /**
   * GET /api/badged_events
   */
  @Get('/badged_events')
  async getBadgedEvents(@Res() response: Response): Promise<Response> {

    const events = await this.eventRepository.findAll();

    logger.info('Fetched badged events', {
      count: events.length,
    });

    return response.status(200).json(events);
  }
}