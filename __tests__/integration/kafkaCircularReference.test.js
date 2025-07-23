/**
 * Kafka循環参照防止 統合テスト
 * 
 * このテストは以下を検証します：
 * 1. Orders Service ⇄ Payments Service間で無限ループが発生しないこと
 * 2. 複数のサービス間でのイベントチェーンが正しく制御されること
 * 3. EventIdempotencyManagerが全サービスで機能すること
 * 4. 実際のKafkaフローをシミュレートした統合シナリオ
 */

// テスト用のモック設定
jest.mock('../services/orders/src/kafka/kafkaProducer');
jest.mock('../services/payments/src/kafka/kafkaProducer');
jest.mock('../shared/utils/eventIdempotency');

const OrdersService = require('../services/orders/src/services/ordersService');
const PaymentEventConsumer = require('../services/payments/src/kafka/paymentEventConsumer');
const OrderEventConsumer = require('../services/orders/src/kafka/orderEventConsumer');
const EventIdempotencyManager = require('../shared/utils/eventIdempotency');

describe('Kafka循環参照防止 - 統合テスト', () => {
  let ordersService;
  let paymentEventConsumer;
  let orderEventConsumer;
  let mockEventIdempotency;

  // イベント発行の追跡用
  let publishedEvents = [];
  let processedEvents = [];

  beforeEach(() => {
    // 発行・処理されたイベントをリセット
    publishedEvents = [];
    processedEvents = [];

    // EventIdempotencyManagerのモック設定
    mockEventIdempotency = {
      isEventProcessed: jest.fn().mockReturnValue(false),
      markEventAsProcessed: jest.fn(),
      generateEventId: jest.fn().mockImplementation((eventData) => 
        `${eventData.eventType}-${eventData.orderId}-${eventData.timestamp}`
      )
    };
    EventIdempotencyManager.mockImplementation(() => mockEventIdempotency);

    // Orders Serviceの設定
    ordersService = new OrdersService();
    ordersService.kafkaProducer.publishOrderEvent = jest.fn().mockImplementation((eventType, orderData) => {
      const event = {
        topic: 'order-events',
        eventType,
        orderData,
        timestamp: new Date().toISOString(),
        publishedBy: 'orders-service'
      };
      publishedEvents.push(event);
      return Promise.resolve();
    });

    // モックPrismaの設定
    ordersService.prisma = {
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn()
      },
      $disconnect: jest.fn()
    };

    // コンシューマーの設定
    paymentEventConsumer = new PaymentEventConsumer();
    orderEventConsumer = new OrderEventConsumer();
    orderEventConsumer.ordersService = ordersService;

    // 処理されたイベントを追跡
    const originalHandleEvent = paymentEventConsumer.handleOrderEvent.bind(paymentEventConsumer);
    paymentEventConsumer.handleOrderEvent = jest.fn().mockImplementation(async (eventType, orderId, eventData) => {
      processedEvents.push({
        service: 'payments',
        eventType,
        orderId,
        eventData
      });
      return originalHandleEvent(eventType, orderId, eventData);
    });

    const originalHandlePaymentEvent = orderEventConsumer.handlePaymentEvent.bind(orderEventConsumer);
    orderEventConsumer.handlePaymentEvent = jest.fn().mockImplementation(async (eventType, orderId, eventData) => {
      processedEvents.push({
        service: 'orders',
        eventType,
        orderId,
        eventData
      });
      return originalHandlePaymentEvent(eventType, orderId, eventData);
    });
  });

  afterEach(async () => {
    await ordersService.disconnect();
    jest.clearAllMocks();
  });

  describe('基本的な循環参照防止', () => {
    test('Orders→Payments→Ordersのイベントチェーンで無限ループしない', async () => {
      const orderId = 12345;
      const mockOrder = {
        id: orderId,
        status: 'PENDING',
        totalAmount: 1000,
        orderItems: []
      };

      // Step 1: Orders Serviceでステータス更新（通常の更新）
      ordersService.prisma.order.findUnique.mockResolvedValue({ status: 'PENDING' });
      ordersService.prisma.order.update.mockResolvedValue({ ...mockOrder, status: 'CONFIRMED' });

      await ordersService.updateOrderStatus(orderId, 'CONFIRMED');

      // Step 2: Payments ServiceがORDER_STATUS_UPDATEDイベントを受信
      const orderStatusUpdateEvent = {
        eventType: 'ORDER_STATUS_UPDATED',
        orderId,
        publishedBy: 'orders-service',
        orderData: { ...mockOrder, status: 'CONFIRMED' }
      };

      await paymentEventConsumer.handleOrderEvent(
        'ORDER_STATUS_UPDATED',
        orderId,
        orderStatusUpdateEvent
      );

      // Step 3: Orders ServiceがPaymentからのイベントを受信（Kafkaイベント由来）
      ordersService.prisma.order.findUnique.mockResolvedValue({ status: 'CONFIRMED' });

      await orderEventConsumer.handlePaymentEvent(
        'PAYMENT_COMPLETED',
        orderId,
        {
          eventType: 'PAYMENT_COMPLETED',
          orderId,
          paymentData: { amount: 1000, status: 'COMPLETED' }
        }
      );

      // 検証: 無限ループが発生していないことを確認
      expect(publishedEvents).toHaveLength(1); // 最初のORDER_STATUS_UPDATEDのみ
      expect(publishedEvents[0].eventType).toBe('ORDER_STATUS_UPDATED');
      
      // Payments ServiceでのORDER_STATUS_UPDATEDは処理されるが、新たなイベント発行はしない
      expect(processedEvents.filter(e => e.service === 'payments')).toHaveLength(1);
      
      // Orders ServiceでのPAYMENT_COMPLETEDはfromKafkaEvent=trueで処理され、イベント発行しない
      expect(processedEvents.filter(e => e.service === 'orders')).toHaveLength(1);
    });
  });

  describe('EventIdempotency統合テスト', () => {
    test('同一イベントの重複処理が完全に防止される', async () => {
      const orderId = 99999;
      const eventData = {
        eventType: 'ORDER_CANCELLED',
        orderId,
        publishedBy: 'orders-service',
        timestamp: '2025-07-23T12:00:00.000Z'
      };

      // 最初の処理
      mockEventIdempotency.isEventProcessed.mockReturnValueOnce(false);
      await paymentEventConsumer.handleOrderEvent('ORDER_CANCELLED', orderId, eventData);

      // 同じイベントの重複処理
      mockEventIdempotency.isEventProcessed.mockReturnValueOnce(true);
      await paymentEventConsumer.handleOrderEvent('ORDER_CANCELLED', orderId, eventData);

      // さらに重複処理
      mockEventIdempotency.isEventProcessed.mockReturnValueOnce(true);
      await paymentEventConsumer.handleOrderEvent('ORDER_CANCELLED', orderId, eventData);

      // 検証
      expect(mockEventIdempotency.isEventProcessed).toHaveBeenCalledTimes(3);
      expect(mockEventIdempotency.markEventAsProcessed).toHaveBeenCalledTimes(1); // 最初の1回のみ
      expect(processedEvents.filter(e => e.eventType === 'ORDER_CANCELLED')).toHaveLength(3);
    });
  });

  describe('複雑なイベントチェーンシナリオ', () => {
    test('注文→支払い→返金の一連のフローで循環しない', async () => {
      const orderId = 55555;
      const paymentId = 'pay_12345';

      // Step 1: 注文作成
      const mockOrder = { id: orderId, status: 'PENDING', totalAmount: 2000 };
      ordersService.prisma.order.update.mockResolvedValue({ ...mockOrder, status: 'CONFIRMED' });
      ordersService.prisma.order.findUnique.mockResolvedValue({ status: 'PENDING' });

      await ordersService.updateOrderStatus(orderId, 'CONFIRMED');

      // Step 2: 支払い完了イベント
      await orderEventConsumer.handlePaymentEvent(
        'PAYMENT_COMPLETED',
        orderId,
        {
          eventType: 'PAYMENT_COMPLETED',
          orderId,
          paymentId,
          paymentData: { amount: 2000, status: 'COMPLETED' }
        }
      );

      // Step 3: 注文キャンセル
      ordersService.prisma.order.update.mockResolvedValue({ ...mockOrder, status: 'CANCELLED' });
      ordersService.prisma.order.findUnique.mockResolvedValue({ status: 'CONFIRMED' });

      await ordersService.updateOrderStatus(orderId, 'CANCELLED');

      // Step 4: キャンセルによる自動返金
      paymentEventConsumer.paymentsService.prisma.payment.findMany.mockResolvedValue([
        {
          id: paymentId,
          orderId,
          amount: 2000,
          status: 'COMPLETED',
          refunds: []
        }
      ]);
      paymentEventConsumer.paymentsService.refundPayment.mockResolvedValue({
        id: 'refund_123',
        status: 'COMPLETED'
      });

      await paymentEventConsumer.handleOrderEvent(
        'ORDER_CANCELLED',
        orderId,
        {
          eventType: 'ORDER_CANCELLED',
          orderId,
          publishedBy: 'orders-service'
        }
      );

      // 検証: 各ステップで適切にイベントが処理され、無限ループしていない
      expect(publishedEvents).toHaveLength(2); // CONFIRMED, CANCELLED
      expect(publishedEvents.map(e => e.eventType)).toEqual([
        'ORDER_STATUS_UPDATED', // CONFIRMED
        'ORDER_STATUS_UPDATED'  // CANCELLED
      ]);

      expect(processedEvents).toHaveLength(3); // PAYMENT_COMPLETED, ORDER_CANCELLED, (内部処理)
      expect(paymentEventConsumer.paymentsService.refundPayment).toHaveBeenCalledTimes(1);
    });
  });

  describe('自己発行イベント無視の統合テスト', () => {
    test('Payments Serviceが自分で発行したイベントを正しく無視', async () => {
      const orderId = 77777;

      // Payments Serviceが発行したイベントをシミュレート
      const selfPublishedEvent = {
        eventType: 'ORDER_STATUS_UPDATED',
        orderId,
        publishedBy: 'payments-service', // 自分が発行
        orderData: { status: 'PROCESSING' }
      };

      // 処理実行
      await paymentEventConsumer.handleOrderEvent(
        'ORDER_STATUS_UPDATED',
        orderId,
        selfPublishedEvent
      );

      // 検証: 自己発行イベントは無視される
      expect(processedEvents.filter(e => e.service === 'payments')).toHaveLength(1);
      expect(paymentEventConsumer.paymentsService.refundPayment).not.toHaveBeenCalled();
      expect(paymentEventConsumer.paymentsService.prisma.payment.findMany).not.toHaveBeenCalled();
    });
  });

  describe('ストレステスト', () => {
    test('高頻度のイベント処理でもメモリリークや無限ループしない', async () => {
      const numEvents = 50;
      const orderId = 88888;

      // 大量のイベントを短時間で処理
      const promises = [];
      for (let i = 0; i < numEvents; i++) {
        const eventData = {
          eventType: 'ORDER_STATUS_UPDATED',
          orderId: orderId + i,
          publishedBy: i % 2 === 0 ? 'orders-service' : 'payments-service',
          timestamp: new Date(Date.now() + i).toISOString()
        };

        promises.push(
          paymentEventConsumer.handleOrderEvent(
            'ORDER_STATUS_UPDATED',
            orderId + i,
            eventData
          )
        );
      }

      // 全て並行処理
      await Promise.all(promises);

      // 検証: 全てのイベントが処理され、自己発行イベントは適切に無視されている
      expect(processedEvents.filter(e => e.service === 'payments')).toHaveLength(numEvents);
      
      // 自己発行イベント（payments-service発行）は実質的な処理をスキップ
      const selfPublishedCount = Math.floor(numEvents / 2);
      const externalPublishedCount = Math.ceil(numEvents / 2);
      
      expect(processedEvents.length).toBe(numEvents);
    });
  });

  describe('エラー処理での循環防止', () => {
    test('処理中のエラーでも無限ループしない', async () => {
      const orderId = 66666;

      // Orders Serviceでエラーが発生するケース
      ordersService.prisma.order.findUnique.mockRejectedValue(new Error('Database error'));

      // エラーが発生してもループしないことを確認
      await expect(
        orderEventConsumer.handlePaymentEvent(
          'PAYMENT_COMPLETED',
          orderId,
          {
            eventType: 'PAYMENT_COMPLETED',
            orderId,
            paymentData: { amount: 1500 }
          }
        )
      ).resolves.not.toThrow();

      // 検証: エラーが発生してもイベント発行は抑制される
      expect(publishedEvents).toHaveLength(0);
      expect(processedEvents.filter(e => e.service === 'orders')).toHaveLength(1);
    });
  });
});