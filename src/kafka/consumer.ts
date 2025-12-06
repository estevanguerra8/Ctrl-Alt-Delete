import { Kafka, Consumer } from 'kafkajs';
import { logger } from '../utils/logging';
import { AppEvent, SeriesKafkaEvent } from './types';

/**
 * Kafka Consumer for Series Sandbox Messaging Environment
 * 
 * Configure brokers, SASL, and topic names according to Series Hackathon Dashboard.pdf.
 * Environment variables required:
 * - KAFKA_BROKERS
 * - KAFKA_USERNAME (SASL username)
 * - KAFKA_PASSWORD (SASL password)
 * - KAFKA_TOPIC
 * - KAFKA_GROUP_ID
 */
export async function startConsumer(
  handleEvent: (event: AppEvent) => Promise<void>
): Promise<void> {
  // Read env vars - see Series Hackathon Dashboard.pdf for actual values
  const brokers = (process.env.KAFKA_BROKERS || '').split(',').filter(Boolean);
  const topic = process.env.KAFKA_TOPIC || '';
  const groupId = process.env.KAFKA_GROUP_ID || 'series-statcard-consumer';
  // Support both naming conventions
  const username = process.env.KAFKA_USERNAME || process.env.KAFKA_SASL_USERNAME || '';
  const password = process.env.KAFKA_PASSWORD || process.env.KAFKA_SASL_PASSWORD || '';
  
  if (!brokers.length || !topic) {
    logger.warn('Kafka brokers or topic not configured, skipping consumer');
    logger.warn('See Series Hackathon Dashboard.pdf for Kafka configuration');
    return;
  }
  
  logger.info(`Connecting to Kafka brokers: ${brokers.join(', ')}`);
  logger.info(`Topic: ${topic}, Group ID: ${groupId}`);
  
  // Set up SASL/PLAIN auth using env vars
  const kafkaConfig: any = {
    clientId: 'series-statcard-service',
    brokers,
  };
  
  if (username && password) {
    kafkaConfig.ssl = true;
    kafkaConfig.sasl = {
      mechanism: 'PLAIN',
      username,
      password,
    };
    logger.info('Kafka configured with SASL_SSL');
    logger.debug(`Using SASL username: ${username.substring(0, 5)}...`);
  } else {
    logger.error('❌ Kafka SASL credentials not found!');
    logger.error('Required env vars: KAFKA_USERNAME (or KAFKA_SASL_USERNAME) and KAFKA_PASSWORD (or KAFKA_SASL_PASSWORD)');
    logger.error('See Series Hackathon Dashboard.pdf for Kafka SASL credentials');
    throw new Error('Kafka SASL credentials are required');
  }
  
  const kafka = new Kafka(kafkaConfig);
  const consumer = kafka.consumer({ groupId });
  
  try {
    await consumer.connect();
    logger.info('Kafka consumer connected');
    
    // Subscribe to KAFKA_TOPIC
    await consumer.subscribe({ topic, fromBeginning: false });
    
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          if (!message.value) {
            return;
          }
          
          const rawMessage = message.value.toString();
          logger.info(`📨 Received message from topic ${topic}, partition ${partition}`);
          logger.info(`📄 Raw message: ${rawMessage.substring(0, 200)}...`);
          
          // Parse JSON into AppEvent or SeriesKafkaEvent
          const event: any = JSON.parse(rawMessage);
          
          // Handle Series Kafka event format
          if ('event_type' in event) {
            const seriesEvent = event as unknown as SeriesKafkaEvent;
            logger.info(`🔍 Event type: ${seriesEvent.event_type}`);
            if (seriesEvent.event_type === 'message.received') {
              logger.info(`💬 Processing message from ${seriesEvent.data.from_phone} in chat ${seriesEvent.data.chat_id}`);
              logger.info(`📝 Message text: "${seriesEvent.data.text}"`);
              // Convert Series event to InboundMessageEvent
              const inboundEvent: AppEvent = {
                type: 'inbound_message',
                userId: seriesEvent.data.from_phone,
                conversationId: seriesEvent.data.chat_id,
                text: seriesEvent.data.text,
                timestamp: new Date(seriesEvent.created_at).getTime(),
              };
              logger.info(`🚀 Calling handleEvent for inbound_message`);
              await handleEvent(inboundEvent);
            } else {
              logger.info(`⚠️ Ignoring event type: ${seriesEvent.event_type}`);
            }
          } else {
            // Handle standard AppEvent format
            logger.info(`🔍 Processing standard AppEvent format`);
            await handleEvent(event as AppEvent);
          }
        } catch (error: any) {
          logger.error('Error processing Kafka message:', error);
        }
      },
    });
    
    logger.info(`✅ Kafka consumer subscribed and listening to topic: ${topic}`);
  } catch (error: any) {
    logger.error('Failed to start Kafka consumer:', error);
    logger.error('See Series Hackathon Dashboard.pdf for correct Kafka configuration');
    throw error;
  }
}

// Legacy export for backward compatibility
export async function startKafkaConsumer(): Promise<void> {
  // This will be called from index.ts with proper event handler
  logger.warn('startKafkaConsumer() called without handler - use startConsumer() instead');
}
