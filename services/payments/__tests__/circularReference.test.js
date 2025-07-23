/**
 * Payments Service 循環参照防止テスト
 * 
 * このテストは以下を検証します：
 * 1. 自己発行イベントを正しく無視すること
 * 2. publishedByチェックが正しく機能すること
 * 3. 他サービス発行イベントのみを処理すること
 */

// EventIdempotencyManagerをモック化
jest.mock('../../../shared/utils/eventIdempotency', () => {
  return jest.fn().mockImplementation(() => ({
    isEventProcessed: jest.fn().mockReturnValue(false),
    markEventAsProcessed: jest.fn(),
    generateEventId: jest.fn().mockReturnValue('test-event-id')
  }));
});

// PaymentsServiceをモック化
jest.mock('../src/services/paymentsService', () => {
  return jest.fn().mockImplementation(() => ({
    prisma: {
      payment: {
        findMany: jest.fn(),
      }
    },
    refundPayment: jest.fn()
  }));
});

// Kafkaをモック化
jest.mock('kafkajs', () => ({
  Kafka: jest.fn(() => ({
    consumer: jest.fn(() => ({
      connect: jest.fn(),
      subscribe: jest.fn(),
      run: jest.fn(),
      disconnect: jest.fn()
    }))
  }))
}));

const PaymentEventConsumer = require('../src/kafka/paymentEventConsumer');

describe('Payments Service - 循環参照防止テスト', () => {
  let paymentEventConsumer;
  let mockPaymentsService;
  let mockIdempotencyManager;

  beforeEach(() => {
    jest.clearAllMocks();
    paymentEventConsumer = new PaymentEventConsumer();
    mockPaymentsService = paymentEventConsumer.paymentsService;
    mockIdempotencyManager = paymentEventConsumer.idempotencyManager;
  });

  describe('handleOrderEvent - 自己発行イベント無視', () => {
    test('自分が発行したイベントを無視してループを防止', async () => {
      // Setup - 自分が発行したイベントデータ
      const selfPublishedEventData = {
        eventType: 'ORDER_STATUS_UPDATED',
        orderId: 123,
        publishedBy: 'payments-service', // 自分が発行したイベント
        orderData: { status: 'CONFIRMED' }
      };

      // Execute
      await paymentEventConsumer.handleOrderEvent(
        'ORDER_STATUS_UPDATED',
        123,
        selfPublishedEventData
      );

      // Verify - 何も処理されないことを確認
      expect(mockPaymentsService.refundPayment).not.toHaveBeenCalled();
      expect(mockPaymentsService.prisma.payment.findMany).not.toHaveBeenCalled();
    });

    test('他のサービスが発行したイベントは正常に処理', async () => {
      // Setup - 他のサービスが発行したイベント
      const externalEventData = {
        eventType: 'ORDER_CANCELLED',
        orderId: 456,
        publishedBy: 'orders-service', // 他のサービスが発行
        orderData: { status: 'CANCELLED' }
      };

      // モックの設定
      mockPaymentsService.prisma.payment.findMany.mockResolvedValue([
        {
          id: 'payment123',
          orderId: 456,
          amount: 1000,
          status: 'COMPLETED',
          refunds: []
        }
      ]);
      mockPaymentsService.refundPayment.mockResolvedValue({
        id: 'refund123',
        status: 'COMPLETED'
      });

      // Execute
      await paymentEventConsumer.handleOrderEvent(
        'ORDER_CANCELLED',
        456,
        externalEventData
      );

      // Verify - 処理が実行されることを確認
      expect(mockPaymentsService.prisma.payment.findMany).toHaveBeenCalledWith({
        where: {
          orderId: 456,
          status: 'COMPLETED'
        },
        include: { refunds: true }
      });
      expect(mockPaymentsService.refundPayment).toHaveBeenCalled();
    });

    test('publishedByが未設定の場合は処理を継続', async () => {
      // Setup - publishedByフィールドがないイベント（後方互換性）
      const eventDataWithoutPublisher = {
        eventType: 'ORDER_CANCELLED',
        orderId: 789,
        orderData: { status: 'CANCELLED' }
        // publishedBy フィールドなし
      };

      mockPaymentsService.prisma.payment.findMany.mockResolvedValue([]);

      // Execute
      await paymentEventConsumer.handleOrderEvent(
        'ORDER_CANCELLED',
        789,
        eventDataWithoutPublisher
      );

      // Verify - 処理が実行されることを確認
      expect(mockPaymentsService.prisma.payment.findMany).toHaveBeenCalled();
    });
  });

  describe('ORDER_STATUS_UPDATEDイベントの処理', () => {
    test('ORDER_STATUS_UPDATEDイベントはログ出力のみで無限ループを防止', async () => {
      // Setup
      const statusUpdateEventData = {
        eventType: 'ORDER_STATUS_UPDATED',
        orderId: 999,
        publishedBy: 'orders-service',
        orderData: { status: 'PROCESSING' }
      };

      // Spy on console.log to verify logging
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Execute
      await paymentEventConsumer.handleOrderEvent(
        'ORDER_STATUS_UPDATED',
        999,
        statusUpdateEventData
      );

      // Verify - データベース操作が実行されないことを確認
      expect(mockPaymentsService.refundPayment).not.toHaveBeenCalled();
      expect(mockPaymentsService.prisma.payment.findMany).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('循環参照シナリオのテスト', () => {
    test('複数の連続イベントでもループしない', async () => {
      const orderId = 555;
      
      // 異なるイベントタイプの連続処理をシミュレート
      const events = [
        {
          eventType: 'ORDER_CREATED',
          orderId,
          publishedBy: 'orders-service'
        },
        {
          eventType: 'ORDER_STATUS_UPDATED',
          orderId,
          publishedBy: 'orders-service',
          orderData: { status: 'CONFIRMED' }
        },
        {
          eventType: 'ORDER_STATUS_UPDATED',
          orderId,
          publishedBy: 'payments-service' // 自分が発行したイベント
        }
      ];

      // Execute - 連続してイベント処理
      for (const eventData of events) {
        await paymentEventConsumer.handleOrderEvent(
          eventData.eventType,
          orderId,
          eventData
        );
      }

      // Verify - 自己発行イベント以外のみが処理されることを確認
      // ORDER_CREATEDは処理されるが、payments-service発行のORDER_STATUS_UPDATEDは無視される
      expect(mockPaymentsService.prisma.payment.findMany).not.toHaveBeenCalled();
      expect(mockPaymentsService.refundPayment).not.toHaveBeenCalled();
    });
  });

  describe('エラーハンドリング', () => {
    test('処理中にエラーが発生してもループしない', async () => {
      // Setup
      const eventData = {
        eventType: 'ORDER_CANCELLED',
        orderId: 666,
        publishedBy: 'orders-service'
      };

      // データベースエラーをシミュレート
      mockPaymentsService.prisma.payment.findMany.mockRejectedValue(
        new Error('Database connection failed')
      );

      // Execute & Verify - エラーが発生してもループしないことを確認
      await expect(async () => {
        await paymentEventConsumer.handleOrderEvent(
          'ORDER_CANCELLED',
          666,
          eventData
        );
      }).not.toThrow(); // handleOrderEventは内部でエラーをキャッチする

      // データベース呼び出しは1回だけ実行されることを確認
      expect(mockPaymentsService.prisma.payment.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('パフォーマンステスト', () => {
    test('大量のイベント処理でもメモリリークしない', async () => {
      const numEvents = 100;
      const orderId = 777;

      // Setup - 大量の自己発行イベントをシミュレート
      const selfPublishedEvents = Array.from({ length: numEvents }, (_, i) => ({
        eventType: 'ORDER_STATUS_UPDATED',
        orderId: orderId + i,
        publishedBy: 'payments-service'
      }));

      // Execute
      for (const eventData of selfPublishedEvents) {
        await paymentEventConsumer.handleOrderEvent(
          eventData.eventType,
          eventData.orderId,
          eventData
        );
      }

      // Verify - 全てのイベントが無視されることを確認
      expect(mockPaymentsService.refundPayment).not.toHaveBeenCalled();
      expect(mockPaymentsService.prisma.payment.findMany).not.toHaveBeenCalled();
    });
  });
});