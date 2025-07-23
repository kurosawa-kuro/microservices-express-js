const TokenRefreshService = require('../src/services/tokenRefreshService');

describe('TokenRefreshService', () => {
  it('should be defined', () => {
    expect(TokenRefreshService).toBeDefined();
  });

  it('should have refreshToken method', () => {
    expect(TokenRefreshService.refreshToken).toBeDefined();
    expect(typeof TokenRefreshService.refreshToken).toBe('function');
  });

  it('should have validateRefreshToken method', () => {
    expect(TokenRefreshService.validateRefreshToken).toBeDefined();
    expect(typeof TokenRefreshService.validateRefreshToken).toBe('function');
  });

  it('should have revokeRefreshToken method', () => {
    expect(TokenRefreshService.revokeRefreshToken).toBeDefined();
    expect(typeof TokenRefreshService.revokeRefreshToken).toBe('function');
  });
});