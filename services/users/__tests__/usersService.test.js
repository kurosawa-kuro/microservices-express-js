// 共有のPrismaクライアントをモック化
jest.mock('../../../shared/database/prismaClient', () => ({
  getUsersClient: jest.fn(() => ({
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    }
  }))
}));

const UsersService = require('../src/services/usersService');

describe('UsersService', () => {
  let usersService;

  beforeEach(() => {
    usersService = new UsersService();
  });

  test('should create UsersService instance', () => {
    expect(usersService).toBeDefined();
    expect(usersService).toBeInstanceOf(UsersService);
  });

  test('should have createUser method', () => {
    expect(usersService.createUser).toBeDefined();
    expect(typeof usersService.createUser).toBe('function');
  });
});