import { Sequelize } from 'sequelize-typescript';
import { Service } from 'typedi';
import { getEnvVar, isDevelopment } from '../config/environment';
import { User } from './models/user.model';
import { Repo } from './models/repo.model';
import { Event } from './models/event.model';

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
      logging: isDevelopment() ? console.log : false,
    });
  }

  async connect(): Promise<void> {
    try {
      await this.sequelize.authenticate();
      console.log('Database connection established successfully.');

      // In development, force sync to recreate tables
      // In production, just sync without dropping
      if (isDevelopment()) {
        await this.sequelize.sync({ force: true });
        console.log('Database synchronized (force mode).');
      } else {
        await this.sequelize.sync();
        console.log('Database synchronized.');
      }
    } catch (error) {
      console.error('Unable to connect to the database:', error);
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
