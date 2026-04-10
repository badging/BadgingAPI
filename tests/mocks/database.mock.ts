import { Sequelize } from 'sequelize-typescript';
import type { Database } from '../../src/shared/data-access/database';
import { User } from '../../src/shared/data-access/models/user.model';
import { Repo } from '../../src/shared/data-access/models/repo.model';
import { Event } from '../../src/shared/data-access/models/event.model';  
import { getEnvVar, isTest } from '../../src/shared/config/environment';
import { RepoRepository } from '../../src/shared';


// Mocked Sequelize instance
export const mockSequelize = {
  authenticate: jest.fn().mockResolvedValue(undefined),
  sync: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
} as Partial<Sequelize>;


// Mocked Database instance
export const mockDatabase: Partial<Database> = {
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  getSequelize: jest.fn().mockReturnValue(mockSequelize),
};

const decorator = () => () => {};
export const sequelizeModuleMock = {
  Sequelize: jest.fn(() => mockSequelize),
  Model: class {},
  Table: decorator,
  Column: decorator,
  HasMany: decorator,
  BelongsTo: decorator,
  ForeignKey: decorator,
  CreatedAt: decorator,
  UpdatedAt: decorator,
  DataType: {
    INTEGER: 'INTEGER',
    STRING: 'STRING',
    DATE: 'DATE',
    JSON: 'JSON',
    NOW: 'NOW',
  },
};



// for integration

export let sequelize: Sequelize;
export let repoRepository: RepoRepository;

export const setupTestDB = async () => {

 const host = getEnvVar('DB_HOST');
  const port = parseInt(getEnvVar('DB_PORT', '3306'), 10); 
  const username = getEnvVar('DB_USER');
  const password = isTest()? getEnvVar('DB_PASSWORD', false) : getEnvVar('DB_PASSWORD');
  const database = getEnvVar('TEST_DB_NAME');
  const dialect = getEnvVar('DB_DIALECT') as 'mysql' | 'postgres' | 'sqlite' | 'mariadb';

  sequelize = new Sequelize({
    dialect,
    host,
    port,
    username,
    password,
    database,
    models: [User, Repo, Event],
    logging: false,
  });

  await sequelize.authenticate();
  await sequelize.sync({ force: true }); 

  repoRepository = new RepoRepository();

  return sequelize;
};

export const teardownTestDB = async () => {
  if (sequelize) await sequelize.close();
};

// -----------------------------
// Helpers to seed test data
// -----------------------------
export const seedUser = async (overrides?: Partial<User>) => {
  return User.create({
    name: 'Test User',
    email: 'test@example.com',
    login: 'testuser',
    githubId: 123,
    gitlabId: null,
    ...overrides,
  });
};

export const seedRepo = async (userId: number, overrides?: Partial<Repo>) => {
  return Repo.create({
    githubRepoId: 456,
    DEICommitSHA: 'abc123',
    repoLink: 'https://github.com/test/repo',
    badgeType: 'bronze',
    attachment: '',
    userId,
    ...overrides,
  });
};

export const seedEvent = async (overrides?: Partial<Event>) => {
 return Event.create({
    event_name: 'Global Conf 2026',
    event_URL: 'https://event.com',
    badge: {
      name: 'Gold',
      badgeURL: 'https://badges.com/gold.png',
    },
    reviewers: [
      { name: 'reviewer1',  github_profile_link:  'https://github.com/reviewer1' },
      { name: 'reviewer2', github_profile_link:  'https://github.com/reviewer2' },
    ],
    application: {
      app_no: 1,
      app_URL: 'http://github.com/issue/1',
    },
    ...overrides, // override any field for custom tests
  });
};





 