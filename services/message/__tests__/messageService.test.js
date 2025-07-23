const MessageService = require('../src/services/messageService');

describe('MessageService', () => {
  let messageService;

  beforeEach(() => {
    messageService = new MessageService();
  });

  it('should create an instance of MessageService', () => {
    expect(messageService).toBeDefined();
    expect(messageService).toBeInstanceOf(MessageService);
  });

  it('should have processEmail method', () => {
    expect(messageService.processEmail).toBeDefined();
    expect(typeof messageService.processEmail).toBe('function');
  });

  it('should have processSms method', () => {
    expect(messageService.processSms).toBeDefined();
    expect(typeof messageService.processSms).toBe('function');
  });

  it('should have simulateEmailSending method', () => {
    expect(messageService.simulateEmailSending).toBeDefined();
    expect(typeof messageService.simulateEmailSending).toBe('function');
  });

  it('should have simulateSmsSending method', () => {
    expect(messageService.simulateSmsSending).toBeDefined();
    expect(typeof messageService.simulateSmsSending).toBe('function');
  });
});