import { Kafka } from 'kafkajs';
import dotenv from 'dotenv';

dotenv.config();

const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const topic = process.env.KAFKA_TOPIC || 'series_team_events';

// SASL configuration
const saslUsername = process.env.KAFKA_SASL_USERNAME;
const saslPassword = process.env.KAFKA_SASL_PASSWORD;
const saslMechanism = process.env.KAFKA_SASL_MECHANISM || 'PLAIN';

const kafkaConfig: any = {
  clientId: 'test-producer',
  brokers,
};

if (saslUsername && saslPassword) {
  kafkaConfig.ssl = true;
  kafkaConfig.sasl = {
    mechanism: saslMechanism,
    username: saslUsername,
    password: saslPassword,
  };
}

const kafka = new Kafka(kafkaConfig);
const producer = kafka.producer();

async function sendTestMessage() {
  await producer.connect();
  console.log('✅ Connected to Kafka');
  
  // Simulate a Series message.received event
  const testEvent = {
    api_version: 'v2',
    created_at: new Date().toISOString(),
    event_id: `test-${Date.now()}`,
    event_type: 'message.received',
    data: {
      attachments: [],
      chat_handles: [
        { display_name: 'You', identifier: '+16463458837', is_me: true },
        { display_name: 'Test User', identifier: '+1234567890', is_me: false }
      ],
      chat_id: '12345',
      from_phone: '+1234567890',
      id: `test-msg-${Date.now()}`,
      is_read: false,
      reaction_id: null,
      sent_at: new Date().toISOString(),
      service: 'iMessage',
      text: '!card'  // Change this to test different commands
    }
  };
  
  await producer.send({
    topic,
    messages: [
      {
        value: JSON.stringify(testEvent),
      },
    ],
  });
  
  console.log('✅ Test message sent!');
  console.log('📝 Command: !card');
  console.log('👀 Check your service terminal for logs');
  
  await producer.disconnect();
}

sendTestMessage().catch(console.error);

