import { JsonController, Post, Body, HeaderParam, Get, Res } from 'routing-controllers';
import { Service } from 'typedi';
import { Response } from 'express';
import { EventBadgingService } from '../services/event-badging.service';
import { EventRepository } from '../../shared/data-access/repositories/event.repository';
import { IGitHubWebhookPayload } from '../../shared/types';

@JsonController('/api')
@Service()
export class EventBadgingController {
  constructor(
    private eventBadgingService: EventBadgingService,
    private eventRepository: EventRepository
  ) {}

  /**
   * POST /api/event_badging
   * Handle GitHub webhook events for event badging
   */
  @Post('/event_badging')
  async handleWebhook(
    @Body() payload: IGitHubWebhookPayload,
    @HeaderParam('x-github-event') eventName: string,
    @Res() response: Response
  ): Promise<Response> {
    try {
      console.info(`Received ${eventName} event from GitHub`);

      // Process webhook asynchronously
      await this.eventBadgingService.processWebhook(eventName, payload);

      return response.send('ok');
    } catch (error) {
      console.error('Error processing webhook:', error);
      return response.status(500).send('Error processing webhook');
    }
  }

  /**
   * GET /api/badged_events
   * Get all badged events
   */
  @Get('/badged_events')
  async getBadgedEvents(@Res() response: Response): Promise<Response> {
    try {
      const events = await this.eventRepository.findAll();
      return response.status(200).json(events);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return response.status(500).json({ error: errorMessage });
    }
  }
}
