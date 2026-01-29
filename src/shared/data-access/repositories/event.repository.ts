import { Service } from 'typedi';
import { Event } from '../models/event.model';
import { IEventCreationAttributes } from '../../types';

@Service()
export class EventRepository {
  /**
   * Find an event by its internal ID
   */
  async findById(eventId: number): Promise<Event | null> {
    return Event.findByPk(eventId);
  }

  /**
   * Find all events
   */
  async findAll(): Promise<Event[]> {
    return Event.findAll();
  }

  /**
   * Create a new event
   */
  async create(eventData: IEventCreationAttributes): Promise<Event> {
    return Event.create(eventData);
  }

  /**
   * Create and save an event
   * Returns the created event or null on error
   */
  async createEvent(eventData: IEventCreationAttributes): Promise<Event | null> {
    try {
      const newEvent = await this.create(eventData);
      console.log(`Event ${newEvent.event_name} created successfully`);
      return newEvent;
    } catch (error) {
      console.error('Error creating event:', error);
      return null;
    }
  }
}
