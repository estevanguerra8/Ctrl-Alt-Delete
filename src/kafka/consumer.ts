import { Kafka, Consumer } from 'kafkajs';
import { logger } from '../utils/logging';
import { processInboundMessage } from '../commands/router';
import { AppEvent, InboundMessageEvent, SeriesKafkaEvent } from './types';

let consumer: Consumer | null = null;

function getKafkaConfig() {
  const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
  const clientId = process.env.KAFKA_CLIENT_ID || 'statcard-service';
  
  // SASL configuration for Confluent Cloud
  const saslUsername = process.env.KAFKA_SASL_USERNAME;
  const saslPassword = process.env.KAFKA_SASL_PASSWORD;
  const saslMechanism = process.env.KAFKA_SASL_MECHANISM || 'PLAIN';
  
  const kafkaConfig: any = {
    clientId,
    brokers,
  };
  
  // Add SASL configuration if credentials are provided
  if (saslUsername && saslPassword) {
    kafkaConfig.ssl = true;
    kafkaConfig.sasl = {
      mechanism: saslMechanism,
      username: saslUsername,
      password: saslPassword,
    };
    logger.info(`Kafka configured with SASL_SSL for brokers: ${brokers.join(', ')}`);
  } else {
    logger.warn('Kafka SASL credentials not found, using plain connection');
  }
  
  return kafkaConfig;
}

export async function startKafkaConsumer(): Promise<void> {
  const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
  const topic = process.env.KAFKA_TOPIC || 'series_team_events';
  const groupId = process.env.KAFKA_GROUP_ID || 'statcard-service';
  
  logger.info(`Connecting to Kafka brokers: ${brokers.join(', ')}`);
  logger.info(`Topic: ${topic}, Group ID: ${groupId}`);
  
  // Debug: Check if SASL credentials are loaded
  if (process.env.KAFKA_SASL_USERNAME && process.env.KAFKA_SASL_PASSWORD) {
    logger.info('Kafka SASL credentials found');
  } else {
    logger.warn('Kafka SASL credentials not found in environment variables');
  }
  
  const kafkaConfig = getKafkaConfig();
  const kafka = new Kafka(kafkaConfig);
  
  consumer = kafka.consumer({ groupId });
  
  await consumer.connect();
  logger.info('Kafka consumer connected');
  
  await consumer.subscribe({ topic, fromBeginning: false });
  
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        if (!message.value) {
          return;
        }
        
        logger.info(`Received message from topic ${topic}, partition ${partition}`);
        const event: AppEvent = JSON.parse(message.value.toString());
        await handleEvent(event);
      } catch (error) {
        logger.error('Error processing Kafka message:', error);
      }
    },
  });
  
  logger.info(`✅ Kafka consumer subscribed and listening to topic: ${topic}`);
  logger.info('📨 Waiting for messages from Series...');
}

async function handleEvent(event: SeriesKafkaEvent | AppEvent): Promise<void> {
  // Handle Series Kafka event format (message.received, etc.)
  if ('event_type' in event) {
    const seriesEvent = event as SeriesKafkaEvent;
    
    switch (seriesEvent.event_type) {
      case 'message.received':
        await handleSeriesMessageReceived(seriesEvent);
        break;
      case 'typing_indicator.received':
      case 'typing_indicator.removed':
        // TODO: Handle typing indicators if needed
        logger.debug('Typing indicator event:', seriesEvent.event_type);
        break;
      default:
        logger.warn('Unknown Series event type:', seriesEvent.event_type);
    }
    return;
  }
  
  // Handle legacy AppEvent format
  switch (event.type) {
    case 'inbound_message':
      await processInboundMessage(event as InboundMessageEvent);
      break;
    case 'stat_update':
      // TODO: Handle stat updates from external sources
      logger.info('Stat update event received:', event);
      break;
    default:
      logger.warn('Unknown event type:', event.type);
  }
}

async function handleSeriesMessageReceived(event: SeriesKafkaEvent): Promise<void> {
  try {
    const { data } = event;
    const messageText = data.text;
    const fromPhone = data.from_phone;
    const chatId = data.chat_id;
    
    // Convert phone number to userId (remove + and spaces, or use phone as-is)
    const userId = fromPhone.replace(/[+\s-()]/g, '');
    
    // Create InboundMessageEvent from Series format
    const inboundEvent: InboundMessageEvent = {
      type: 'inbound_message',
      userId,
      channelId: chatId,
      message: messageText,
      messageId: data.id,
      timestamp: event.created_at,
    };
    
    await processInboundMessage(inboundEvent);
  } catch (error) {
    logger.error('Error handling Series message.received event:', error);
  }
}

