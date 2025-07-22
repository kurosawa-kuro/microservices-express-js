const KafkaProducer = require('../src/kafka/kafkaProducer');
const OrderEventConsumer = require('../src/kafka/orderEventConsumer');

describe('Kafka Integration', () => {
  describe('KafkaProducer', () => {
    let producer;

    beforeEach(() => {
      producer = new KafkaProducer();
    });

    afterEach(async () => {
      await producer.disconnect();
    });

    test('should create KafkaProducer instance', () => {
      expect(producer).toBeInstanceOf(KafkaProducer);
      expect(producer.kafka).toBeDefined();
      expect(producer.producer).toBeDefined();
    });

    test('should have publishOrderEvent method', () => {
      expect(typeof producer.publishOrderEvent).toBe('function');
    });

    test('should have publishPaymentEvent method', () => {
      expect(typeof producer.publishPaymentEvent).toBe('function');
    });

    test('should have publishInventoryEvent method', () => {
      expect(typeof producer.publishInventoryEvent).toBe('function');
    });
  });

  describe('OrderEventConsumer', () => {
    let consumer;

    beforeEach(() => {
      consumer = new OrderEventConsumer();
    });

    afterEach(async () => {
      await consumer.stop();
    });

    test('should create OrderEventConsumer instance', () => {
      expect(consumer).toBeInstanceOf(OrderEventConsumer);
      expect(consumer.kafka).toBeDefined();
      expect(consumer.consumer).toBeDefined();
    });

    test('should have handleEvent method', () => {
      expect(typeof consumer.handleEvent).toBe('function');
    });

    test('should have handlePaymentEvent method', () => {
      expect(typeof consumer.handlePaymentEvent).toBe('function');
    });

    test('should have handleInventoryEvent method', () => {
      expect(typeof consumer.handleInventoryEvent).toBe('function');
    });

    test('should have handleShippingEvent method', () => {
      expect(typeof consumer.handleShippingEvent).toBe('function');
    });
  });
});
