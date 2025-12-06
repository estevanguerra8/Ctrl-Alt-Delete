import dotenv from 'dotenv';
import { startHttpServer } from './api/httpServer';
import { startKafkaConsumer } from './kafka/consumer';
import { loadUserStore } from './core/userStore';
import { loadDuels } from './core/duelManager';
import { logger } from './utils/logging';

dotenv.config();

async function main() {
  logger.info('Starting Series StatCard Service...');

  // Load persisted data
  await loadUserStore();
  await loadDuels();

  // Start HTTP server
  const port = parseInt(process.env.PORT || '3000', 10);
  await startHttpServer(port);

  // Start Kafka consumer (non-blocking - service can run without Kafka)
  startKafkaConsumer().catch((error) => {
    logger.error('Failed to start Kafka consumer:', error);
    logger.warn('Service will continue running without Kafka consumer');
  });

  logger.info('✅ Service ready and waiting for events');
  logger.info('💡 Send a message to your Series chat (e.g., !card) to test');
}

main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});

