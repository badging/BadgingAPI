import { Container } from 'typedi';
import { mockDatabase, mockSequelize } from '../../mocks/database.mock';
import { Database } from '../../../src/shared/data-access';

describe('Database (unit tests with mocks)', () => {
  let db: Database;

  beforeEach(() => {
    Container.reset();
    Container.set(Database, mockDatabase as any);
    db = Container.get(Database);
  });

  afterEach(() => {
    jest.clearAllMocks();
    Container.reset();
  });

  test('connect() should be called', async () => {
    await db.connect();
    expect(mockDatabase.connect).toHaveBeenCalled();
  });

  test('disconnect() should be called', async () => {
    await db.disconnect();
    expect(mockDatabase.disconnect).toHaveBeenCalled();
  });

  test('getSequelize() should return mocked sequelize', () => {
    const sequelize = db.getSequelize();
    expect(sequelize).toBe(mockSequelize);
    expect(mockDatabase.getSequelize).toHaveBeenCalled();
  });


  test('connect() should throw an error if the connection is refused', async () => {
    (mockDatabase.connect as jest.Mock).mockRejectedValueOnce(new Error('ECONNREFUSED'));

    await expect(db.connect()).rejects.toThrow('ECONNREFUSED');

    expect(mockDatabase.connect).toHaveBeenCalled();
  });

  test('disconnect() should handle being called multiple times gracefully', async () => {
    await db.disconnect();
    await db.disconnect();

    expect(mockDatabase.disconnect).toHaveBeenCalledTimes(2);
  });

 
})



