import { Kafka } from 'kafkajs';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const topic = process.env.KAFKA_TOPIC || 'series_team_events';

const kafka = new Kafka({
  clientId: 'statcard-manual-producer',
  brokers,
});

const producer = kafka.producer();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function sendMessage(message: string) {
  await producer.connect();
  
  const event = {
    type: 'inbound_message',
    userId: 'user1', // TODO: Make configurable
    channelId: 'channel1',
    message: message,
    messageId: `msg-${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
  
  await producer.send({
    topic,
    messages: [
      {
        value: JSON.stringify(event),
      },
    ],
  });
  
  console.log(`Sent: ${message}`);
  await producer.disconnect();
}

function prompt() {
  rl.question('Enter message (or "exit" to quit): ', async (answer) => {
    if (answer.toLowerCase() === 'exit') {
      rl.close();
      process.exit(0);
    }
    
    await sendMessage(answer);
    prompt();
  });
}

console.log('Kafka Producer - Type messages to send to Series topic');
console.log('Type "exit" to quit\n');

prompt();

