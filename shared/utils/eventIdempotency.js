const NodeCache = require('node-cache');
const logger = require('./logger');

/**
 * Event Idempotency Manager
 * 同一イベントの重複処理を防ぐためのユーティリティ
 */
class EventIdempotencyManager {
  constructor(options = {}) {
    this.cache = new NodeCache({
      stdTTL: options.ttl || 3600, // デフォルト1時間
      checkperiod: options.checkperiod || 120, // 2分ごとにクリーンアップ
      useClones: false
    });
    
    this.serviceName = options.serviceName || 'unknown-service';
  }

  /**
   * イベントIDを生成
   */
  generateEventId(eventData) {
    const { eventType, orderId, paymentId, refundId, timestamp } = eventData;
    
    // 複数の識別子を組み合わせてユニークなIDを生成
    const identifiers = [
      eventType,
      orderId && `order:${orderId}`,
      paymentId && `payment:${paymentId}`,
      refundId && `refund:${refundId}`,
      timestamp
    ].filter(Boolean);
    
    return identifiers.join('-');
  }

  /**
   * イベントが既に処理済みかチェック
   */
  isEventProcessed(eventData) {
    const eventId = this.generateEventId(eventData);
    const processed = this.cache.has(eventId);
    
    if (processed) {
      logger.warn('Duplicate event detected', {
        eventId,
        eventType: eventData.eventType,
        serviceName: this.serviceName
      });
    }
    
    return processed;
  }

  /**
   * イベントを処理済みとしてマーク
   */
  markEventAsProcessed(eventData) {
    const eventId = this.generateEventId(eventData);
    this.cache.set(eventId, true);
    
    logger.debug('Event marked as processed', {
      eventId,
      eventType: eventData.eventType,
      serviceName: this.serviceName
    });
    
    return eventId;
  }

  /**
   * 処理済みイベントの統計情報を取得
   */
  getStats() {
    const keys = this.cache.keys();
    return {
      totalProcessedEvents: keys.length,
      cacheHitRatio: this.cache.getStats()
    };
  }

  /**
   * キャッシュをクリア（テスト用）
   */
  clear() {
    this.cache.flushAll();
  }
}

module.exports = EventIdempotencyManager;