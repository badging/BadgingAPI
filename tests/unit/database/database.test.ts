const mockAuthenticate = jest.fn();
const mockSync = jest.fn();
const mockClose = jest.fn();

const mockSequelizeInstance = {
  authenticate: mockAuthenticate,
  sync: mockSync,
  close: mockClose,
};

const MockSequelize = jest.fn().mockImplementation(() => mockSequelizeInstance);

jest.mock('sequelize-typescript', () => ({
  Sequelize: MockSequelize,
}));

jest.mock('../../../src/shared/config/environment', () => ({
  getEnvVar: jest.fn((key: string, _required?: boolean | string) => {
    const values: Record<string, string> = {
      DB_NAME: 'badging_test',
      DB_USER: 'test_user',
      DB_PASSWORD: 'test_password',
      DB_HOST: 'localhost',
      DB_DIALECT: 'mysql',
      DB_PORT: '3306',
    };
    return values[key] ?? '';
  }),
  isDevelopment: jest.fn(() => false),
}));


jest.mock('../../../src/shared/data-access/models/user.model', () => ({ User: class User {} }));
jest.mock('../../../src/shared/data-access/models/repo.model', () => ({ Repo: class Repo {} }));
jest.mock('../../../src/shared/data-access/models/event.model', () => ({ Event: class Event {} }));

jest.mock('../../../src/shared/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { Database } from '../../../src/shared/data-access/database';
import { User } from '../../../src/shared/data-access/models/user.model';
import { Repo } from '../../../src/shared/data-access/models/repo.model';
import { Event } from '../../../src/shared/data-access/models/event.model';
import * as envConfig from '../../../src/shared/config/environment';

describe('Database (real class, mocked Sequelize)', () => {
  beforeEach(() => {
    MockSequelize.mockClear();
    mockAuthenticate.mockReset();
    mockSync.mockReset();
    mockClose.mockReset();
    (envConfig.isDevelopment as jest.Mock).mockReturnValue(false);
  });

  describe('constructor', () => {
    test('should construct Sequelize with the options derived from env vars', () => {
      new Database();

      expect(MockSequelize).toHaveBeenCalledTimes(1);
      expect(MockSequelize).toHaveBeenCalledWith(
        expect.objectContaining({
          database: 'badging_test',
          username: 'test_user',
          password: 'test_password',
          host: 'localhost',
          dialect: 'mysql',
          port: 3306,
          models: [User, Repo, Event],
        }),
      );
    });

    test('should parse DB_PORT as an integer', () => {
      new Database();

      const passedOptions = MockSequelize.mock.calls[0][0] as { port: number };
      expect(passedOptions.port).toBe(3306);
      expect(typeof passedOptions.port).toBe('number');
    });

    test('should disable SQL logging in production', () => {
      (envConfig.isDevelopment as jest.Mock).mockReturnValue(false);

      new Database();

      const passedOptions = MockSequelize.mock.calls[0][0] as { logging: unknown };
      expect(passedOptions.logging).toBe(false);
    });

    test('should enable SQL logging in development', () => {
      (envConfig.isDevelopment as jest.Mock).mockReturnValue(true);

      new Database();

      const passedOptions = MockSequelize.mock.calls[0][0] as { logging: unknown };
      expect(typeof passedOptions.logging).toBe('function');
    });
  });

  describe('connect()', () => {
    test('should call authenticate() and sync() (without force) in production', async () => {
      (envConfig.isDevelopment as jest.Mock).mockReturnValue(false);
      mockAuthenticate.mockResolvedValueOnce(undefined);
      mockSync.mockResolvedValueOnce(undefined);

      const db = new Database();
      await db.connect();

      expect(mockAuthenticate).toHaveBeenCalledTimes(1);
      expect(mockSync).toHaveBeenCalledTimes(1);
      expect(mockSync).toHaveBeenCalledWith();
    });

    test('should call sync({ force: true }) in development', async () => {
      (envConfig.isDevelopment as jest.Mock).mockReturnValue(true);
      mockAuthenticate.mockResolvedValueOnce(undefined);
      mockSync.mockResolvedValueOnce(undefined);

      const db = new Database();
      await db.connect();

      expect(mockAuthenticate).toHaveBeenCalledTimes(1);
      expect(mockSync).toHaveBeenCalledWith({ force: true });
    });

    test('should rethrow if authenticate() rejects', async () => {
      mockAuthenticate.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const db = new Database();

      await expect(db.connect()).rejects.toThrow('ECONNREFUSED');
      expect(mockAuthenticate).toHaveBeenCalledTimes(1);
      expect(mockSync).not.toHaveBeenCalled();
    });
  });

  describe('getSequelize()', () => {
    test('should return the underlying Sequelize instance', () => {
      const db = new Database();

      expect(db.getSequelize()).toBe(mockSequelizeInstance);
    });
  });

  describe('disconnect()', () => {
    test('should call close() on the Sequelize instance', async () => {
      mockClose.mockResolvedValueOnce(undefined);

      const db = new Database();
      await db.disconnect();

      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    test('should call close() each time it is invoked', async () => {
      mockClose.mockResolvedValue(undefined);

      const db = new Database();
      await db.disconnect();
      await db.disconnect();

      expect(mockClose).toHaveBeenCalledTimes(2);
    });
  });
});
