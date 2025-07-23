// Mock Prisma Client
jest.mock('../src/prismaClient', () => ({
  topPageDisplay: {}
}));

const ContentService = require('../src/services/contentService');

describe('ContentService', () => {
  let contentService;

  beforeEach(() => {
    contentService = new ContentService();
  });

  it('should create an instance of ContentService', () => {
    expect(contentService).toBeDefined();
    expect(contentService).toBeInstanceOf(ContentService);
  });

  it('should have createTopPageDisplay method', () => {
    expect(contentService.createTopPageDisplay).toBeDefined();
    expect(typeof contentService.createTopPageDisplay).toBe('function');
  });

  it('should have getTopPageDisplay method', () => {
    expect(contentService.getTopPageDisplay).toBeDefined();
    expect(typeof contentService.getTopPageDisplay).toBe('function');
  });

  it('should have updateTopPageDisplay method', () => {
    expect(contentService.updateTopPageDisplay).toBeDefined();
    expect(typeof contentService.updateTopPageDisplay).toBe('function');
  });

  it('should have deleteTopPageDisplay method', () => {
    expect(contentService.deleteTopPageDisplay).toBeDefined();
    expect(typeof contentService.deleteTopPageDisplay).toBe('function');
  });

  it('should have getTopPageDisplays method', () => {
    expect(contentService.getTopPageDisplays).toBeDefined();
    expect(typeof contentService.getTopPageDisplays).toBe('function');
  });

  it('should have getActiveTopPageDisplays method', () => {
    expect(contentService.getActiveTopPageDisplays).toBeDefined();
    expect(typeof contentService.getActiveTopPageDisplays).toBe('function');
  });

  it('should have toggleTopPageDisplayStatus method', () => {
    expect(contentService.toggleTopPageDisplayStatus).toBeDefined();
    expect(typeof contentService.toggleTopPageDisplayStatus).toBe('function');
  });
});