import { InboundMessageEvent } from '../kafka/types';
import { handleCardCommand } from './handlers/cardHandler';
import { handleLeaderboardCommand } from './handlers/leaderboardHandler';
import { handleDuelCommand, handleAcceptCommand, handleDuelStatusCommand } from './handlers/duelHandler';
import { handleProgressCommand } from './handlers/progressHandler';
import { logger } from '../utils/logging';

export async function processInboundMessage(event: InboundMessageEvent): Promise<void> {
  const { message, userId } = event;
  
  if (!message.startsWith('!')) {
    return; // Not a command
  }
  
  const parts = message.trim().split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);
  
  try {
    switch (command) {
      case '!card':
        await handleCardCommand(userId);
        break;
      case '!leaderboard':
        await handleLeaderboardCommand(userId, args);
        break;
      case '!duel':
        await handleDuelCommand(userId, args);
        break;
      case '!accept':
        await handleAcceptCommand(userId, args);
        break;
      case '!duel_status':
        await handleDuelStatusCommand(userId, args);
        break;
      case '!progress':
        await handleProgressCommand(userId);
        break;
      default:
        logger.warn(`Unknown command: ${command}`);
    }
  } catch (error) {
    logger.error(`Error processing command ${command}:`, error);
  }
}

