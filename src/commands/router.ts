import { InboundMessageEvent, AppEvent } from '../kafka/types';
import { handleCardCommand } from './handlers/cardHandler';
import { handleLeaderboardCommand } from './handlers/leaderboardHandler';
import { handleDuelCommand, handleAcceptCommand, handleDuelStatusCommand } from './handlers/duelHandler';
import { handleProgressCommand } from './handlers/progressHandler';
import { logger } from '../utils/logging';
import { createSeriesClient } from '../messaging/seriesClient';
import { updateUserState } from '../core/userStore';
import { updateUserStats } from '../core/statEngine';
import { updateRanks } from '../core/leaderboardService';

// Lazy initialization - create client when first needed (after dotenv.config() has run)
let seriesClient: ReturnType<typeof createSeriesClient> | null = null;
function getSeriesClient() {
  if (!seriesClient) {
    seriesClient = createSeriesClient();
  }
  return seriesClient;
}

/**
 * Command Router
 * Receives InboundMessageEvent and routes to appropriate handlers
 * Each handler returns a string or null
 * If non-null, uses SeriesClient to send the response back to the conversation
 */
export async function processInboundMessage(event: InboundMessageEvent): Promise<void> {
  const { text, userId, conversationId } = event;
  
  if (!text || !text.trim().startsWith('!')) {
    return;
  }
  
  const parts = text.trim().split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);
  
  logger.info(`🎯 Command: ${command} from ${userId}`);
  
  // Update user's last active time
  updateUserState(userId, { lastActiveAt: Date.now() });
  
  try {
    let response: string | null = null;
    
    switch (command) {
      case '!card':
        response = await handleCardCommand(userId);
        break;
      case '!leaderboard':
        response = await handleLeaderboardCommand(userId, args);
        break;
      case '!duel':
        response = await handleDuelCommand(userId, args);
        break;
      case '!accept':
        response = await handleAcceptCommand(userId, args);
        break;
      case '!duel_status':
        response = await handleDuelStatusCommand(userId, args);
        break;
      case '!progress':
        response = await handleProgressCommand(userId);
        break;
      default:
        logger.warn(`Unknown command: ${command}`);
        response = `Unknown command: ${command}. Available: !card, !leaderboard, !duel, !accept, !progress`;
    }
    
    // Send response back via Series API
    if (response) {
      await getSeriesClient().sendMessageToConversation(conversationId, response);
    }
  } catch (error: any) {
    logger.error(`Error processing command ${command}:`, error);
    try {
      await getSeriesClient().sendMessageToConversation(conversationId, 'Sorry, there was an error processing your command.');
    } catch (sendError) {
      logger.error('Failed to send error message:', sendError);
    }
  }
}

/**
 * Handle stat_update events
 * Update user via statEngine, recompute Elo, rebuild leaderboards, send notifications
 */
export async function handleStatUpdate(event: AppEvent & { type: 'stat_update' }): Promise<void> {
  const { userId, metric, delta } = event;
  
  logger.info(`Stat update: ${userId} - ${metric} += ${delta}`);
  
  const user = updateUserState(userId, {});
  const currentValue = user.metrics[metric];
  const newValue = Math.max(0, Math.min(100, currentValue + delta));
  
  updateUserState(userId, {
    metrics: {
      ...user.metrics,
      [metric]: newValue,
    },
  });
  
  // Recompute overall score and Elo
  updateUserStats(userId);
  
  // Rebuild leaderboards
  updateRanks();
  
  // TODO: Send notifications if significant changes
}
