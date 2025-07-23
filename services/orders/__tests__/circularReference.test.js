/**
 * Orders Service 循環参照防止テスト
 * 
 * このテストは以下を検証します：
 * 1. Kafkaイベントからの呼び出し時に無限ループが発生しないこと
 * 2. 同一ステータスへの重複更新がスキップされること
 * 3. fromKafkaEventフラグが正しく機能すること
 */

// Kafkaプロデューサーをモック化
jest.mock('../src/kafka/kafkaProducer', () => {
  return jest.fn().mockImplementation(() => ({
    publishOrderEvent: jest.fn(),
    publishPaymentEvent: jest.fn(),
    publishInventoryEvent: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn()
  }));
});

// Prismaクライアントをモック化
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn()
    },
    $disconnect: jest.fn()
  }))
}));

const OrdersService = require('../src/services/ordersService');
const KafkaProducer = require('../src/kafka/kafkaProducer');

describe('Orders Service - 循環参照防止テスト', () => {
  let ordersService;
  let mockKafkaProducer;
  let mockPrisma;

  beforeEach(() => {
    // モックをリセット
    jest.clearAllMocks();
    
    ordersService = new OrdersService();
    mockKafkaProducer = ordersService.kafkaProducer;
    mockPrisma = ordersService.prisma;
  });

  afterEach(async () => {
    await ordersService.disconnect();
  });

  describe('updateOrderStatus - 循環参照防止', () => {
    const orderId = 123;
    const userId = 'user123';
    const mockOrder = {
      id: orderId,
      userId,
      status: 'PENDING',
      totalAmount: 1000,
      orderItems: []
    };

    test('fromKafkaEvent=trueの場合、イベント発行をスキップしてループを防止', async () => {
      // Setup
      mockPrisma.order.findUnique.mockResolvedValue({ status: 'PENDING' });
      mockPrisma.order.update.mockResolvedValue({ ...mockOrder, status: 'CONFIRMED' });

      // Execute - Kafkaイベントからの呼び出しをシミュレート
      const result = await ordersService.updateOrderStatus(
        orderId, 
        'CONFIRMED', 
        userId, 
        { fromKafkaEvent: true }
      );

      // Verify
      expect(result.status).toBe('CONFIRMED');
      expect(mockKafkaProducer.publishOrderEvent).not.toHaveBeenCalled(); // イベント発行されないことを確認
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: orderId, userId },
        data: { status: 'CONFIRMED' },
        include: { orderItems: true }
      });
    });

    test('fromKafkaEvent=falseの場合、通常通りイベント発行', async () => {
      // Setup
      mockPrisma.order.findUnique.mockResolvedValue({ status: 'PENDING' });
      mockPrisma.order.update.mockResolvedValue({ ...mockOrder, status: 'CONFIRMED' });

      // Execute - 通常の呼び出し
      const result = await ordersService.updateOrderStatus(orderId, 'CONFIRMED', userId);

      // Verify
      expect(result.status).toBe('CONFIRMED');
      expect(mockKafkaProducer.publishOrderEvent).toHaveBeenCalledWith(
        'ORDER_STATUS_UPDATED', 
        { ...mockOrder, status: 'CONFIRMED' }
      );
    });

    test('同一ステータスへの更新時、処理をスキップしてループを防止', async () => {
      // Setup - 既に同じステータス
      mockPrisma.order.findUnique
        .mockResolvedValueOnce({ status: 'CONFIRMED' }) // 現在のステータス取得
        .mockResolvedValueOnce({ ...mockOrder, status: 'CONFIRMED' }); // getOrder用

      // Execute
      const result = await ordersService.updateOrderStatus(orderId, 'CONFIRMED', userId);

      // Verify
      expect(result.status).toBe('CONFIRMED');
      expect(mockPrisma.order.update).not.toHaveBeenCalled(); // DBアップデートが発生しないことを確認
      expect(mockKafkaProducer.publishOrderEvent).not.toHaveBeenCalled(); // イベント発行されないことを確認
    });

    test('skipEventPublish=trueの場合、イベント発行をスキップ', async () => {
      // Setup
      mockPrisma.order.findUnique.mockResolvedValue({ status: 'PENDING' });
      mockPrisma.order.update.mockResolvedValue({ ...mockOrder, status: 'CONFIRMED' });

      // Execute
      const result = await ordersService.updateOrderStatus(
        orderId, 
        'CONFIRMED', 
        userId, 
        { skipEventPublish: true }
      );

      // Verify
      expect(result.status).toBe('CONFIRMED');
      expect(mockKafkaProducer.publishOrderEvent).not.toHaveBeenCalled();
      expect(mockPrisma.order.update).toHaveBeenCalled();
    });
  });

  describe('Kafkaイベント処理でのループ防止統合テスト', () => {
    test('複数回の同じイベント処理でもループしない', async () => {
      const orderId = 456;
      const mockOrder = {
        id: orderId,
        status: 'PENDING',
        totalAmount: 2000,
        orderItems: []
      };

      // Setup - 最初は PENDING、2回目以降は CONFIRMED を返すようにモックを設定
      mockPrisma.order.findUnique
        .mockResolvedValueOnce({ status: 'PENDING' })    // 1回目：現在のステータス取得
        .mockResolvedValueOnce({ ...mockOrder, status: 'CONFIRMED' }) // 1回目：getOrder用
        .mockResolvedValueOnce({ status: 'CONFIRMED' })   // 2回目：現在のステータス取得（重複チェック）
        .mockResolvedValueOnce({ ...mockOrder, status: 'CONFIRMED' }) // 2回目：getOrder用
        .mockResolvedValueOnce({ status: 'CONFIRMED' })   // 3回目：現在のステータス取得（重複チェック）
        .mockResolvedValueOnce({ ...mockOrder, status: 'CONFIRMED' }); // 3回目：getOrder用
      
      mockPrisma.order.update.mockResolvedValue({ ...mockOrder, status: 'CONFIRMED' });

      // Execute - 同じ処理を複数回実行（実際のKafka環境でのイベント重複をシミュレート）
      await ordersService.updateOrderStatus(orderId, 'CONFIRMED', null, { fromKafkaEvent: true });
      await ordersService.updateOrderStatus(orderId, 'CONFIRMED', null, { fromKafkaEvent: true });
      await ordersService.updateOrderStatus(orderId, 'CONFIRMED', null, { fromKafkaEvent: true });

      // Verify - イベント発行が一度も実行されないことを確認
      expect(mockKafkaProducer.publishOrderEvent).not.toHaveBeenCalled();
      
      // DB更新は最初の1回だけ実行されるはず（同一ステータスチェックにより2回目以降はスキップ）
      expect(mockPrisma.order.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('エラーハンドリング', () => {
    test('不正なステータスでもループが発生しない', async () => {
      // Execute & Verify
      await expect(
        ordersService.updateOrderStatus(123, 'INVALID_STATUS', null, { fromKafkaEvent: true })
      ).rejects.toThrow('Invalid order status');
      
      // エラーが発生してもイベント発行されないことを確認
      expect(mockKafkaProducer.publishOrderEvent).not.toHaveBeenCalled();
    });
  });
});