import { Container } from 'typedi';
import { Database } from './database';
import {logger} from '../logger';

export async function initializeDatabase(): Promise<void> {
  logger.info('Connecting to database...');
  const database = Container.get(Database);
  await database.connect();
  logger.info('Database connected');
}


export async function disconnectDatabase(): Promise<void> {
  logger.info('Disconnecting from database...');
  const database = Container.get(Database);
  await database.disconnect();
  logger.info('Database disconnected');
}
