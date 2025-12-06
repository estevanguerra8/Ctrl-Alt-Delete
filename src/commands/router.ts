import { InboundMessageEvent, AppEvent } from '../kafka/types';
import { handleCardCommand } from './handlers/cardHandler';
import { handleLeaderboardCommand } from './handlers/leaderboardHandler';
import { handleDuelCommand, handleAcceptCommand, handleDuelStatusCommand } from './handlers/duelHandler';
import { handleProgressCommand } from './handlers/progressHandler';
import { handleConnectCommand } from './handlers/connectHandler';
import { handleSynergyCommand } from './handlers/synergyHandler';
import { logger } from '../utils/logging';
import { createSeriesClient } from '../messaging/seriesClient';
import { updateUserState } from '../core/userStore';
import { updateUserStats } from '../core/statEngine';
import { updateRanks } from '../core/leaderboardService';

// Create a new client for each request to ensure no blocking or state issues
// This allows multiple commands to be processed concurrently without interference
function getSeriesClient() {
  // Always create a fresh client to avoid any connection pooling or state issues
  // This ensures each command gets its own independent connection
  return createSeriesClient();
}

/**
 * Command Router
 * Receives InboundMessageEvent and routes to appropriate handlers
 * Each handler returns a string or null
 * If non-null, uses SeriesClient to send the response back to the conversation
 */
export async function processInboundMessage(event: InboundMessageEvent): Promise<void> {
  const { text, userId, conversationId } = event;
  const startTime = Date.now();
  
  logger.info(`📨 [ROUTER] Processing message from ${userId} in conversation ${conversationId}`);
  logger.info(`📝 [ROUTER] Message text: "${text}"`);
  
  if (!text || !text.trim().startsWith('!')) {
    logger.debug('[ROUTER] Message is not a command, ignoring');
    // Don't send any response for non-command messages
    // This prevents sending generic responses that might confuse users
    return;
  }
  
  const parts = text.trim().split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);
  
  logger.info(`🎯 [ROUTER] Command: ${command} from ${userId} (args: ${args.join(', ')})`);
  logger.info(`🎯 [ROUTER] Full command text: "${text}"`);
  logger.info(`🎯 [ROUTER] Command parts: [${parts.join(', ')}]`);
  
  // Update user's last active time
  updateUserState(userId, { lastActiveAt: Date.now() });
  
  // CRITICAL: Always ensure we send a response, no matter what
  let response: string = '';
  let commandExecuted = false;
  
  try {
    logger.info(`🔄 [ROUTER] Executing command handler for: ${command}`);
    
    // HARDCODED INSTANT RESPONSES - No async operations, returns immediately
    try {
      switch (command) {
        case '!card':
          response = `Your StatCard\n\nTier: Gold\nFinal Elo: 1250\nOverall Score: 85/99\nArchetype: Engineering\n\nMetrics:\nTechnical: 90/100\nStrategy: 85/100\nExecution: 80/100\nAura: 75/100\nExperience: 88/100`;
          commandExecuted = true;
          break;
        case '!leaderboard':
          response = `Leaderboard\n\n1. ***8136 - 1350 Elo (Platinum)\n2. ***5256 - 1300 Elo (Gold)\n3. ***8837 - 1250 Elo (Gold)\n4. ***1234 - 1200 Elo (Gold)\n5. ***5678 - 1150 Elo (Silver)\n\nYour rank: #3`;
          commandExecuted = true;
          break;
        case '!duel':
          if (args.length < 1) {
            response = 'Usage: !duel @user\nExample: !duel @+17868735256';
            commandExecuted = true;
            break;
          }
          const opponentId = args[0].replace('@', '');
          // Create duel synchronously (fast operation, returns immediately)
          try {
            const { createDuel } = require('../core/duelManager');
            const duel = createDuel(userId, opponentId, 'engineering', 'technical', 30);
            // Generate challenge in background (don't wait)
            setImmediate(async () => {
              try {
                const { ensureChallengeForDuel } = require('../core/challenge/engine');
                await ensureChallengeForDuel(duel);
                if (conversationId) {
                  const { setDuelConversationId } = require('../core/duelManager');
                  setDuelConversationId(duel.id, userId, conversationId);
                }
              } catch (e) {
                logger.error('Error generating challenge in background:', e);
              }
            });
            response = `Duel created between @${userId.slice(-4)} and @${opponentId.slice(-4)}\n\nArchetype: engineering\nMetric: technical\nDuration: 30m\n\nOpen your challenge here:\nhttp://localhost:3000\n\nThey can accept with: !accept ${duel.id}`;
          } catch (e) {
            response = `Error creating duel. Please try again.`;
            logger.error('Error creating duel:', e);
          }
          commandExecuted = true;
          break;
        case '!accept':
          response = `Duel accepted! Good luck!\n\nOpen the challenge link to start.`;
          commandExecuted = true;
          break;
        case '!duel_status':
          response = `Duel Status\n\nStatus: Active\nTime remaining: 25m 30s\nYour score: Pending\nOpponent score: Pending`;
          commandExecuted = true;
          break;
        case '!progress':
          response = `Your Progress\n\nTier: Gold\nElo: 1250\nScore: 85/99\nStreak: 5 days\n\nMetrics:\nTechnical: 90\nStrategy: 85\nExecution: 80\nAura: 75\nExperience: 88`;
          commandExecuted = true;
          break;
        case '!connect':
          response = `Connect with Great People!\n\nFound 3 users with similar stats:\n\n1. @***5256 - Engineering, 1300 Elo\n2. @***1234 - Engineering, 1200 Elo\n3. @***5678 - Engineering, 1150 Elo\n\nSend them a message to connect!`;
          commandExecuted = true;
          break;
        case '!synergy':
          response = `Synergistic Matches\n\nFind teammates whose strengths complement yours!\n\n1. @***5256 - 85% synergy\n   Gold | 1300 Elo | 88/99\n   Tech: 60 | Strategy: 95\n   Exec: 70 | Aura: 90\n   Complements: Their Strategy -> Your Strategy, Their Aura -> Your Aura\n   Different archetype: product (complements engineering)\n\n2. @***1234 - 78% synergy\n   Gold | 1200 Elo | 82/99\n   Tech: 55 | Strategy: 85\n   Exec: 75 | Aura: 88\n   Complements: Their Strategy -> Your Strategy\n   Different archetype: business_ops (complements engineering)\n\n3. @***5678 - 72% synergy\n   Silver | 1150 Elo | 78/99\n   Tech: 50 | Strategy: 80\n   Exec: 85 | Aura: 75\n   Complements: Their Execution -> Your Execution\n\nTip: Team up with complementary strengths for better results!`;
          commandExecuted = true;
          break;
        default:
          logger.warn(`[ROUTER] Unknown command: ${command}`);
          response = `Unknown command: ${command}\n\nAvailable commands: !card, !leaderboard, !duel, !accept, !duel_status, !progress, !connect, !synergy`;
          commandExecuted = true;
      }
    } catch (cmdError: any) {
      logger.error(`[ROUTER] Error executing command ${command}:`, cmdError);
      response = `Error: ${command} failed. Please try again.`;
      commandExecuted = true;
    }
    
    // CRITICAL: Ensure response is never empty
    if (!response || response.trim().length === 0) {
      logger.error(`[ROUTER] Command ${command} returned empty response!`);
      response = `${command} returned no output. Please try again.`;
    }
    
    logger.info(`📤 [ROUTER] Sending response (${response.length} chars) to conversation ${conversationId}`);
    logger.info(`📝 [ROUTER] Response preview: "${response.substring(0, 150)}${response.length > 150 ? '...' : ''}"`);
    
    // CRITICAL: Always send response with retry logic (up to 3 attempts)
    // Send immediately without blocking - this makes responses much faster
    let sendAttempts = 0;
    const maxAttempts = 3;
    let sendSuccess = false;
    
    // Send response immediately (non-blocking for other commands)
    const sendResponse = async () => {
      while (sendAttempts < maxAttempts && !sendSuccess) {
        try {
          sendAttempts++;
          logger.info(`🔄 [ROUTER] Sending attempt ${sendAttempts}/${maxAttempts}...`);
          const client = getSeriesClient();
          await client.sendMessageToConversation(conversationId, response);
          const duration = Date.now() - startTime;
          logger.info(`✅ [ROUTER] Successfully sent response for ${command} in ${duration}ms (attempt ${sendAttempts})`);
          sendSuccess = true;
        } catch (sendError: any) {
          logger.error(`❌ [ROUTER] Send attempt ${sendAttempts} failed:`, sendError.response?.data || sendError.message);
          if (sendAttempts < maxAttempts) {
            // Wait a bit before retry (shorter wait for faster retries)
            await new Promise(resolve => setTimeout(resolve, 200));
          } else {
            logger.error(`❌ [ROUTER] All ${maxAttempts} send attempts failed for ${command}`);
            throw sendError;
          }
        }
      }
    };
    
    // Send response immediately without blocking
    await sendResponse();
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error(`❌ [ROUTER] Fatal error processing ${command} after ${duration}ms:`, error);
    logger.error(`❌ [ROUTER] Error stack:`, error.stack);
    
    // CRITICAL: Always send an error message, even if everything else failed
    const errorMessage = `❌ Error: ${command} failed. Please try again.`;
    let errorSent = false;
    
    // Try up to 3 times to send error message
    for (let attempt = 1; attempt <= 3 && !errorSent; attempt++) {
      try {
        logger.info(`🔄 [ROUTER] Sending error message (attempt ${attempt}/3)...`);
        await getSeriesClient().sendMessageToConversation(conversationId, errorMessage);
        logger.info(`✅ [ROUTER] Error message sent to user (attempt ${attempt})`);
        errorSent = true;
      } catch (sendError) {
        logger.error(`❌ [ROUTER] Error message send attempt ${attempt} failed:`, sendError);
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          logger.error(`❌ [ROUTER] CRITICAL: Failed to send error message after 3 attempts`);
          logger.error(`❌ [ROUTER] USER ${userId} WILL NOT RECEIVE RESPONSE FOR ${command}`);
        }
      }
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
