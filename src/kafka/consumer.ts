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
  // Use unique client ID with timestamp to avoid stale consumer issues
  const clientId = process.env.KAFKA_CLIENT_ID || `series-statcard-${Date.now()}`;
  const kafkaConfig: any = {
    clientId,
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
  // Configure consumer for concurrent processing
  const consumer = kafka.consumer({ 
    groupId,
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
    // Allow multiple messages to be processed concurrently
    maxInFlightRequests: 10,
  });
  
  try {
    await consumer.connect();
    logger.info('Kafka consumer connected');
    
    // Subscribe to KAFKA_TOPIC
    await consumer.subscribe({ topic, fromBeginning: false });
    
    // Process messages - allow concurrent processing for faster responses
    // Each message is processed independently, but we ensure responses are sent
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        logger.info(`📨 [KAFKA] Received message from partition ${partition}, offset ${message.offset}`);
        
        // Process message immediately without blocking other messages
        // This allows multiple commands to be processed concurrently
        processMessageImmediately(topic, partition, message, handleEvent)
          .then(() => {
            logger.info(`✅ [KAFKA] Message processed and response sent successfully`);
          })
          .catch((error: any) => {
            logger.error(`❌ [KAFKA] Error processing message:`, error);
            logger.error(`❌ [KAFKA] Error stack:`, error.stack);
          });
        
        // Don't await - allow Kafka to fetch next message immediately
        // This makes responses much faster
      },
    });
    
    logger.info(`✅ Kafka consumer subscribed and listening to topic: ${topic}`);
  } catch (error: any) {
    logger.error('Failed to start Kafka consumer:', error);
    logger.error('See Series Hackathon Dashboard.pdf for correct Kafka configuration');
    throw error;
  }
}

/**
 * Process message immediately - completely non-blocking
 * This function processes the message without any blocking operations
 */
async function processMessageImmediately(
  topic: string,
  partition: number,
  message: any,
  handleEvent: (event: AppEvent) => Promise<void>
): Promise<void> {
  const messageStartTime = Date.now();
  try {
    if (!message.value) {
      return;
    }
    
    const rawMessage = message.value.toString();
    logger.info(`📨 Processing message from partition ${partition}, offset ${message.offset}`);
    
    // Parse JSON
    let event: any;
    try {
      event = JSON.parse(rawMessage);
    } catch (parseError: any) {
      logger.error('❌ Failed to parse message JSON:', parseError);
      return;
    }
    
    // Handle Series Kafka event format
    if ('event_type' in event) {
      const seriesEvent = event as unknown as SeriesKafkaEvent;
      if (seriesEvent.event_type === 'message.received') {
        logger.info(`💬 [PARSE] Processing message from ${seriesEvent.data.from_phone} in chat ${seriesEvent.data.chat_id}`);
        logger.info(`📝 [PARSE] Message text: "${seriesEvent.data.text}"`);
        
        const inboundEvent: AppEvent = {
          type: 'inbound_message',
          userId: seriesEvent.data.from_phone,
          conversationId: seriesEvent.data.chat_id,
          text: seriesEvent.data.text,
          timestamp: new Date(seriesEvent.created_at).getTime(),
        };
        
        logger.info(`🚀 [PARSE] Calling handleEvent for inbound_message...`);
        // CRITICAL: AWAIT the event handler to ensure it completes fully
        // This ensures the response is sent before the next message is processed
        await handleEvent(inboundEvent);
        logger.info(`✅ [PARSE] handleEvent completed`);
      }
    } else {
      // Handle standard AppEvent format - await to ensure completion
      logger.info(`🚀 [PARSE] Calling handleEvent for standard AppEvent...`);
      await handleEvent(event as AppEvent);
      logger.info(`✅ [PARSE] handleEvent completed`);
    }
  } catch (error: any) {
    logger.error(`❌ Error processing message:`, error);
  }
}

/**
 * Process message asynchronously without blocking the consumer
 * This allows multiple messages to be processed concurrently
 */
async function processMessageAsync(
  topic: string,
  partition: number,
  message: any,
  handleEvent: (event: AppEvent) => Promise<void>
): Promise<void> {
  const messageStartTime = Date.now();
  try {
    if (!message.value) {
      logger.debug('Message has no value, skipping');
      return;
    }
    
    const rawMessage = message.value.toString();
    logger.info(`📨 Received message from topic ${topic}, partition ${partition}, offset ${message.offset}`);
    logger.debug(`📄 Raw message: ${rawMessage.substring(0, 200)}...`);
    
    // Parse JSON into AppEvent or SeriesKafkaEvent
    let event: any;
    try {
      event = JSON.parse(rawMessage);
    } catch (parseError: any) {
      logger.error('❌ Failed to parse message JSON:', parseError);
      logger.error('Raw message:', rawMessage);
      return;
    }
    
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
        
        // CRITICAL: Don't await - process in background so next message can be processed immediately
        // Use setImmediate to ensure this runs after the callback returns
        setImmediate(async () => {
          try {
            await Promise.race([
              handleEvent(inboundEvent),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Event handler timeout after 60s')), 60000)
              )
            ]);
            const duration = Date.now() - messageStartTime;
            logger.info(`✅ Message processed successfully in ${duration}ms`);
          } catch (error: any) {
            const duration = Date.now() - messageStartTime;
            logger.error(`❌ Error in handleEvent after ${duration}ms:`, error);
          }
        });
        
        // Return immediately - don't wait for processing
        return;
      } else {
        logger.info(`⚠️ Ignoring event type: ${seriesEvent.event_type}`);
      }
    } else {
      // Handle standard AppEvent format
      logger.info(`🔍 Processing standard AppEvent format`);
      
      // CRITICAL: Don't await - process in background so next message can be processed immediately
      setImmediate(async () => {
        try {
          await Promise.race([
            handleEvent(event as AppEvent),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Event handler timeout after 60s')), 60000)
            )
          ]);
          const duration = Date.now() - messageStartTime;
          logger.info(`✅ Event processed successfully in ${duration}ms`);
        } catch (error: any) {
          const duration = Date.now() - messageStartTime;
          logger.error(`❌ Error in handleEvent after ${duration}ms:`, error);
        }
      });
      
      // Return immediately - don't wait for processing
      return;
    }
  } catch (error: any) {
    const duration = Date.now() - messageStartTime;
    logger.error(`❌ Error processing Kafka message after ${duration}ms:`, error);
    logger.error('Error stack:', error.stack);
    // Don't throw - continue processing other messages
  }
}

// Legacy export for backward compatibility
export async function startKafkaConsumer(): Promise<void> {
  // This will be called from index.ts with proper event handler
  logger.warn('startKafkaConsumer() called without handler - use startConsumer() instead');
}
