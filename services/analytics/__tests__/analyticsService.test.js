// Mock Prisma Client
jest.mock('../src/prismaClient', () => ({
  viewHistory: {},
  userActionLog: {}
}));

const AnalyticsService = require('../src/services/analyticsService');

describe('AnalyticsService', () => {
  let analyticsService;

  beforeEach(() => {
    analyticsService = new AnalyticsService();
  });

  it('should create an instance of AnalyticsService', () => {
    expect(analyticsService).toBeDefined();
    expect(analyticsService).toBeInstanceOf(AnalyticsService);
  });

  it('should have createViewHistory method', () => {
    expect(analyticsService.createViewHistory).toBeDefined();
    expect(typeof analyticsService.createViewHistory).toBe('function');
  });

  it('should have getViewHistory method', () => {
    expect(analyticsService.getViewHistory).toBeDefined();
    expect(typeof analyticsService.getViewHistory).toBe('function');
  });

  it('should have getUserViewHistory method', () => {
    expect(analyticsService.getUserViewHistory).toBeDefined();
    expect(typeof analyticsService.getUserViewHistory).toBe('function');
  });

  it('should have createUserActionLog method', () => {
    expect(analyticsService.createUserActionLog).toBeDefined();
    expect(typeof analyticsService.createUserActionLog).toBe('function');
  });

  it('should have getUserActionLogs method', () => {
    expect(analyticsService.getUserActionLogs).toBeDefined();
    expect(typeof analyticsService.getUserActionLogs).toBe('function');
  });

  it('should have getActionLogsByType method', () => {
    expect(analyticsService.getActionLogsByType).toBeDefined();
    expect(typeof analyticsService.getActionLogsByType).toBe('function');
  });

  it('should have deleteViewHistory method', () => {
    expect(analyticsService.deleteViewHistory).toBeDefined();
    expect(typeof analyticsService.deleteViewHistory).toBe('function');
  });
});