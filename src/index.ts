// Load env FIRST before any other imports that might use env vars
import dotenv from 'dotenv';
dotenv.config();

import { startHttpServer } from './api/httpServer';
import { startConsumer } from './kafka/consumer';
import { loadUserStore } from './core/userStore';
import { loadDuels } from './core/duelManager';
import { logger } from './utils/logging';
import { processInboundMessage, handleStatUpdate } from './commands/router';
import { AppEvent } from './kafka/types';

async function main() {
  logger.info('Starting Series StatCard Service...');

  // Load config - see domainConfig.ts
  // Initialize services
  await loadUserStore();
  await loadDuels();

  // Start HTTP server (optional - only if ENABLE_HTTP_SERVER is set)
  // The HTTP server is used for StatCard API and duel pages
  // If you only need Kafka → Series API messaging, you can disable it
  if (process.env.ENABLE_HTTP_SERVER !== 'false') {
    const port = Number(process.env.PORT) || 3000;
    startHttpServer(port);
    logger.info(`HTTP server enabled on port ${port} (set ENABLE_HTTP_SERVER=false to disable)`);
  } else {
    logger.info('HTTP server disabled (ENABLE_HTTP_SERVER=false)');
  }

  // Start Kafka consumer with async handleEvent function
  // Configure brokers, SASL, and topic names according to Series Hackathon Dashboard.pdf
  startConsumer(async (event: AppEvent) => {
    logger.info(`🔄 [INDEX] handleEvent called for event type: ${event.type}`);
    // CRITICAL: AWAIT to ensure each message completes fully before next one starts
    // This ensures each command gets its response before the next command is processed
    if (event.type === 'inbound_message') {
      logger.info(`🔄 [INDEX] Processing inbound_message...`);
      // AWAIT to ensure full processing (including response sent) before next message
      await processInboundMessage(event);
      logger.info(`✅ [INDEX] processInboundMessage completed`);
    } else if (event.type === 'stat_update') {
      logger.info(`🔄 [INDEX] Processing stat_update...`);
      // AWAIT stat update processing
      await handleStatUpdate(event as AppEvent & { type: 'stat_update' });
      logger.info(`✅ [INDEX] handleStatUpdate completed`);
    }
  }).catch((error) => {
    logger.error('Failed to start Kafka consumer:', error);
    logger.warn('Service will continue running without Kafka consumer');
    logger.warn('See Series Hackathon Dashboard.pdf for correct Kafka configuration');
  });

  logger.info('✅ Service ready and waiting for events');
  logger.info('💡 Send a message to your Series chat (e.g., !card) to test');
  logger.info('');
  logger.info('📋 Configuration references:');
  logger.info('   - Kafka: See Series Hackathon Dashboard.pdf');
  logger.info('   - Series API: See iMessage Service API Docs.pdf');
}

main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
