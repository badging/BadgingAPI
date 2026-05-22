import { Sequelize } from 'sequelize-typescript';
import { Service } from 'typedi';
import { getEnvVar, isDevelopment } from '../config/environment';
import { User } from './models/user.model';
import { Repo } from './models/repo.model';
import { Event } from './models/event.model';
import { logger } from '../logger';

@Service()
export class Database {
  private sequelize: Sequelize;

  constructor() {
    this.sequelize = new Sequelize({
      database: getEnvVar('DB_NAME'),
      username: getEnvVar('DB_USER'),
      password: isDevelopment() ? getEnvVar('DB_PASSWORD', false) : getEnvVar('DB_PASSWORD', true),
      host: getEnvVar('DB_HOST'),
      dialect: getEnvVar('DB_DIALECT') as 'mysql' | 'postgres' | 'sqlite' | 'mariadb',
      port: parseInt(getEnvVar('DB_PORT', '3306'), 10),
      models: [User, Repo, Event],
      logging: isDevelopment()
        ? (msg) => logger.debug('SQL Query', { query: msg })
        : false,
    });
  }

  async connect(): Promise<void> {
    try {
      await this.sequelize.authenticate();
      logger.info('Database connection established successfully.');

      // In development, force sync to recreate tables
      // In production, just sync without dropping
      if (isDevelopment()) {
        await this.sequelize.sync({ force: true });
        logger.warn('Database synchronized (force mode) for dev only.');
      } else {
        await this.sequelize.sync();
        logger.info('Database synchronized.');
      }
    } catch (error: unknown) {
        throw error;
    }
  }

  getSequelize(): Sequelize {
    return this.sequelize;
  }

  async disconnect(): Promise<void> {
    await this.sequelize.close();
  }
}
