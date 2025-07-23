// Mock dependencies
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    payment: {},
    refund: {},
    $disconnect: jest.fn()
  }))
}));

jest.mock('../src/services/stripeService', () => {
  return jest.fn().mockImplementation(() => ({
    processPayment: jest.fn(),
    processRefund: jest.fn()
  }));
});

jest.mock('../src/kafka/kafkaProducer', () => {
  return jest.fn().mockImplementation(() => ({
    publishPaymentEvent: jest.fn(),
    publishRefundEvent: jest.fn(),
    disconnect: jest.fn()
  }));
});

const PaymentsService = require('../src/services/paymentsService');

describe('PaymentsService', () => {
  let paymentsService;

  beforeEach(() => {
    paymentsService = new PaymentsService();
  });

  afterEach(async () => {
    // Clean up connections
    if (paymentsService.disconnect) {
      await paymentsService.disconnect();
    }
  });

  it('should create an instance of PaymentsService', () => {
    expect(paymentsService).toBeDefined();
    expect(paymentsService).toBeInstanceOf(PaymentsService);
  });

  it('should have processPayment method', () => {
    expect(paymentsService.processPayment).toBeDefined();
    expect(typeof paymentsService.processPayment).toBe('function');
  });

  it('should have getPayment method', () => {
    expect(paymentsService.getPayment).toBeDefined();
    expect(typeof paymentsService.getPayment).toBe('function');
  });

  it('should have refundPayment method', () => {
    expect(paymentsService.refundPayment).toBeDefined();
    expect(typeof paymentsService.refundPayment).toBe('function');
  });

  it('should have getPaymentHistory method', () => {
    expect(paymentsService.getPaymentHistory).toBeDefined();
    expect(typeof paymentsService.getPaymentHistory).toBe('function');
  });

  it('should have disconnect method', () => {
    expect(paymentsService.disconnect).toBeDefined();
    expect(typeof paymentsService.disconnect).toBe('function');
  });
});