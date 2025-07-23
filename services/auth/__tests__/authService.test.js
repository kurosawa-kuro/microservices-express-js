// 共有のPrismaクライアントをモック化
jest.mock('../../../shared/database/prismaClient', () => ({
  getAuthClient: jest.fn(() => ({
    authUser: {
      findFirst: jest.fn(),
      create: jest.fn(),
    }
  }))
}));

const AuthService = require('../src/services/authService');

describe('AuthService', () => {
  let authService;

  beforeEach(() => {
    authService = new AuthService();
  });

  test('should create AuthService instance', () => {
    expect(authService).toBeDefined();
    expect(authService).toBeInstanceOf(AuthService);
  });

  test('should have verifyToken method', () => {
    expect(authService.verifyToken).toBeDefined();
    expect(typeof authService.verifyToken).toBe('function');
  });
});