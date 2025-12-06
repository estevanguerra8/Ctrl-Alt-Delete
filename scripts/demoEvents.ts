import { Kafka } from 'kafkajs';
import dotenv from 'dotenv';

dotenv.config();

const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const topic = process.env.KAFKA_TOPIC || 'series_team_events';

const kafka = new Kafka({
  clientId: 'statcard-demo-producer',
  brokers,
});

const producer = kafka.producer();

async function sendDemoEvents() {
  await producer.connect();
  console.log('Connected to Kafka');
  
  // Send some fake stat_update events
  const events = [
    {
      type: 'stat_update',
      userId: 'user1',
      archetype: 'engineering',
      metric: 'rating',
      value: 1200,
      timestamp: new Date().toISOString(),
    },
    {
      type: 'stat_update',
      userId: 'user2',
      archetype: 'engineering',
      metric: 'rating',
      value: 1100,
      timestamp: new Date().toISOString(),
    },
  ];
  
  for (const event of events) {
    await producer.send({
      topic,
      messages: [
        {
          value: JSON.stringify(event),
        },
      ],
    });
    console.log(`Sent event: ${event.type} for ${event.userId}`);
  }
  
  await producer.disconnect();
  console.log('Disconnected from Kafka');
}

sendDemoEvents().catch(console.error);

