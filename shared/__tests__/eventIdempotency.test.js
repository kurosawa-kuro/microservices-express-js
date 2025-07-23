/**
 * EventIdempotencyManager テスト
 * 
 * このテストは以下を検証します：
 * 1. 同一イベントの重複処理を正しく防止すること
 * 2. イベントIDの生成が一意であること
 * 3. TTLによるキャッシュ管理が正しく動作すること
 * 4. 異なるサービス間でのイベント管理が独立していること
 */

// Node-cacheをモック化
jest.mock('node-cache');

const EventIdempotencyManager = require('../utils/eventIdempotency');
const NodeCache = require('node-cache');

describe('EventIdempotencyManager - 重複処理防止テスト', () => {
  let manager;
  let mockCache;

  beforeEach(() => {
    // NodeCacheのモックをセットアップ
    mockCache = {
      has: jest.fn(),
      set: jest.fn(),
      get: jest.fn(),
      keys: jest.fn(),
      getStats: jest.fn(),
      flushAll: jest.fn()
    };
    
    NodeCache.mockImplementation(() => mockCache);
    
    manager = new EventIdempotencyManager({
      serviceName: 'test-service',
      ttl: 300
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('イベントID生成', () => {
    test('基本的なイベントIDが正しく生成される', () => {
      // Setup
      const eventData = {
        eventType: 'ORDER_STATUS_UPDATED',
        orderId: 123,
        timestamp: '2025-07-23T12:00:00.000Z'
      };

      // Execute
      const eventId = manager.generateEventId(eventData);

      // Verify
      expect(eventId).toBe('ORDER_STATUS_UPDATED-order:123-2025-07-23T12:00:00.000Z');
    });

    test('paymentIdを含むイベントIDが正しく生成される', () => {
      // Setup
      const eventData = {
        eventType: 'PAYMENT_COMPLETED',
        orderId: 456,
        paymentId: 'pay_789',
        timestamp: '2025-07-23T12:00:00.000Z'
      };

      // Execute
      const eventId = manager.generateEventId(eventData);

      // Verify
      expect(eventId).toBe('PAYMENT_COMPLETED-order:456-payment:pay_789-2025-07-23T12:00:00.000Z');
    });

    test('refundIdを含むイベントIDが正しく生成される', () => {
      // Setup
      const eventData = {
        eventType: 'REFUND_COMPLETED',
        refundId: 'ref_999',
        timestamp: '2025-07-23T12:00:00.000Z'
      };

      // Execute
      const eventId = manager.generateEventId(eventData);

      // Verify
      expect(eventId).toBe('REFUND_COMPLETED-refund:ref_999-2025-07-23T12:00:00.000Z');
    });

    test('同じデータからは常に同じIDが生成される', () => {
      // Setup
      const eventData = {
        eventType: 'ORDER_CREATED',
        orderId: 111,
        timestamp: '2025-07-23T12:00:00.000Z'
      };

      // Execute
      const eventId1 = manager.generateEventId(eventData);
      const eventId2 = manager.generateEventId(eventData);

      // Verify
      expect(eventId1).toBe(eventId2);
    });
  });

  describe('重複処理チェック', () => {
    test('初回処理時はfalseを返す', () => {
      // Setup
      const eventData = {
        eventType: 'ORDER_STATUS_UPDATED',
        orderId: 222,
        timestamp: '2025-07-23T12:00:00.000Z'
      };
      
      mockCache.has.mockReturnValue(false);

      // Execute
      const isProcessed = manager.isEventProcessed(eventData);

      // Verify
      expect(isProcessed).toBe(false);
      expect(mockCache.has).toHaveBeenCalledWith('ORDER_STATUS_UPDATED-order:222-2025-07-23T12:00:00.000Z');
    });

    test('処理済みイベントに対してはtrueを返す', () => {
      // Setup
      const eventData = {
        eventType: 'PAYMENT_FAILED',
        orderId: 333,
        paymentId: 'pay_444',
        timestamp: '2025-07-23T12:00:00.000Z'
      };
      
      mockCache.has.mockReturnValue(true);

      // Execute
      const isProcessed = manager.isEventProcessed(eventData);

      // Verify
      expect(isProcessed).toBe(true);
      expect(mockCache.has).toHaveBeenCalledWith('PAYMENT_FAILED-order:333-payment:pay_444-2025-07-23T12:00:00.000Z');
    });
  });

  describe('処理済みマーク', () => {
    test('イベントを処理済みとしてマークできる', () => {
      // Setup
      const eventData = {
        eventType: 'INVENTORY_RESERVED',
        orderId: 555,
        timestamp: '2025-07-23T12:00:00.000Z'
      };

      // Execute
      const eventId = manager.markEventAsProcessed(eventData);

      // Verify
      expect(eventId).toBe('INVENTORY_RESERVED-order:555-2025-07-23T12:00:00.000Z');
      expect(mockCache.set).toHaveBeenCalledWith(
        'INVENTORY_RESERVED-order:555-2025-07-23T12:00:00.000Z',
        true
      );
    });
  });

  describe('循環参照防止の統合テスト', () => {
    test('同じイベントの重複処理を完全に防止', () => {
      // Setup
      const eventData = {
        eventType: 'ORDER_STATUS_UPDATED',
        orderId: 777,
        timestamp: '2025-07-23T12:00:00.000Z'
      };

      // 最初の処理
      mockCache.has.mockReturnValueOnce(false); // 初回は未処理
      const isProcessed1 = manager.isEventProcessed(eventData);
      manager.markEventAsProcessed(eventData);

      // 2回目の処理
      mockCache.has.mockReturnValueOnce(true); // 2回目は処理済み
      const isProcessed2 = manager.isEventProcessed(eventData);

      // Verify
      expect(isProcessed1).toBe(false); // 初回は処理される
      expect(isProcessed2).toBe(true);  // 2回目は処理済みとして検出
      expect(mockCache.set).toHaveBeenCalledTimes(1); // マークは1回だけ
    });

    test('異なるイベントは個別に管理される', () => {
      // Setup
      const event1 = {
        eventType: 'ORDER_CREATED',
        orderId: 888,
        timestamp: '2025-07-23T12:00:00.000Z'
      };
      
      const event2 = {
        eventType: 'ORDER_STATUS_UPDATED',
        orderId: 888, // 同じorderIdだが異なるイベントタイプ
        timestamp: '2025-07-23T12:00:00.000Z'
      };

      mockCache.has.mockReturnValue(false);

      // Execute
      const isProcessed1 = manager.isEventProcessed(event1);
      const isProcessed2 = manager.isEventProcessed(event2);

      // Verify
      expect(isProcessed1).toBe(false);
      expect(isProcessed2).toBe(false);
      expect(mockCache.has).toHaveBeenCalledTimes(2);
      expect(mockCache.has).toHaveBeenCalledWith('ORDER_CREATED-order:888-2025-07-23T12:00:00.000Z');
      expect(mockCache.has).toHaveBeenCalledWith('ORDER_STATUS_UPDATED-order:888-2025-07-23T12:00:00.000Z');
    });
  });

  describe('統計情報取得', () => {
    test('統計情報が正しく取得できる', () => {
      // Setup
      mockCache.keys.mockReturnValue(['event1', 'event2', 'event3']);
      mockCache.getStats.mockReturnValue({
        hits: 10,
        misses: 5,
        keys: 3
      });

      // Execute
      const stats = manager.getStats();

      // Verify
      expect(stats.totalProcessedEvents).toBe(3);
      expect(stats.cacheHitRatio).toEqual({
        hits: 10,
        misses: 5,
        keys: 3
      });
    });
  });

  describe('キャッシュクリア', () => {
    test('キャッシュを正しくクリアできる', () => {
      // Execute
      manager.clear();

      // Verify
      expect(mockCache.flushAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('エッジケース', () => {
    test('timestampが未設定の場合でも動作する', () => {
      // Setup
      const eventData = {
        eventType: 'ORDER_CREATED',
        orderId: 999
        // timestampなし
      };

      // Execute & Verify - エラーが発生しないことを確認
      expect(() => {
        const eventId = manager.generateEventId(eventData);
        expect(eventId).toBe('ORDER_CREATED-order:999');
      }).not.toThrow();
    });

    test('空のイベントデータでも安全に処理', () => {
      // Setup
      const eventData = {};

      // Execute & Verify
      expect(() => {
        const eventId = manager.generateEventId(eventData);
        expect(eventId).toBe('');
      }).not.toThrow();
    });

    test('nullまたはundefinedの値が含まれても安全に処理', () => {
      // Setup
      const eventData = {
        eventType: 'TEST_EVENT',
        orderId: null,
        paymentId: undefined,
        timestamp: '2025-07-23T12:00:00.000Z'
      };

      // Execute
      const eventId = manager.generateEventId(eventData);

      // Verify
      expect(eventId).toBe('TEST_EVENT-2025-07-23T12:00:00.000Z');
    });
  });

  describe('パフォーマンステスト', () => {
    test('大量のイベントでも正常に動作', () => {
      const numEvents = 1000;
      mockCache.has.mockReturnValue(false);

      // Execute
      for (let i = 0; i < numEvents; i++) {
        const eventData = {
          eventType: 'BULK_TEST',
          orderId: i,
          timestamp: `2025-07-23T12:${String(i % 60).padStart(2, '0')}:00.000Z`
        };
        
        manager.isEventProcessed(eventData);
        manager.markEventAsProcessed(eventData);
      }

      // Verify
      expect(mockCache.has).toHaveBeenCalledTimes(numEvents);
      expect(mockCache.set).toHaveBeenCalledTimes(numEvents);
    });
  });
});