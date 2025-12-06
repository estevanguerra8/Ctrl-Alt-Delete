import { createDuel, acceptDuel, getUserDuels, ensureChallengeForDuel, setDuelConversationId } from '../../core/duelManager';
import { parseDuration } from '../../utils/validation';
import { logger } from '../../utils/logging';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/**
 * Format user ID for display
 */
function formatUserId(userId: string): string {
  if (/^\+?\d+$/.test(userId)) {
    const last4 = userId.slice(-4);
    return `***${last4}`;
  }
  return userId.length > 8 ? userId.substring(0, 8) + '...' : userId;
}

/**
 * Duel Handler
 * !duel, !accept, !duel_status → creates duels + links
 */
export async function handleDuelCommand(userId: string, args: string[]): Promise<string> {
  try {
    logger.info(`⚔️ [DUEL] !duel from: ${userId}, args: ${args.join(' ')}`);
    
    if (args.length < 1) {
      return 'Usage: !duel @user\nExample: !duel @+17868735256';
    }
    
    const opponentId = args[0].replace('@', '');
    
    if (opponentId === userId) {
      return 'You cannot duel yourself!';
    }
    
    // Simplified: use defaults for everything
    const archetype = 'engineering' as const;
    const metric = 'technical' as const;
    const durationMinutes = 30;
    
    logger.info(`⚔️ [DUEL] Creating duel: ${userId} vs ${opponentId}`);
    
           // Create the duel
           const duel = createDuel(userId, opponentId, archetype, metric, durationMinutes);
           logger.info(`⚔️ [DUEL] Duel created: ${duel.id}`);
           
           // Store conversationId for this user (so we can send comparison message later)
           // Note: conversationId should be passed from the router, but for now we'll handle it in the router
           
           // CRITICAL: Ensure challenge exists before sending link
           logger.info(`⚔️ [DUEL] Generating challenge for duel ${duel.id}...`);
           await ensureChallengeForDuel(duel);
           logger.info(`⚔️ [DUEL] Challenge generated`);
    
    // Generate the duel URL (remove trailing slashes) - use base URL for cleaner link
    const baseUrl = (process.env.PUBLIC_BASE_URL || process.env.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const duelUrl = baseUrl;
    
    logger.info(`⚔️ [DUEL] Duel URL: ${duelUrl}`);
    
    const response = `⚔️ Duel created between @${formatUserId(userId)} and @${formatUserId(opponentId)}\n\n` +
           `Archetype: ${archetype}\n` +
           `Metric: ${metric}\n` +
           `Duration: ${durationMinutes}m\n\n` +
           `Open your challenge here:\n${duelUrl}\n\n` +
           `They can accept with: !accept ${duel.id}`;
    
    logger.info(`⚔️ [DUEL] Response generated (${response.length} chars)`);
    return response;
  } catch (error: any) {
    logger.error('❌ [DUEL] Error handling duel command:', error);
    logger.error('❌ [DUEL] Error stack:', error.stack);
    return '❌ Error creating duel. Please try again.';
  }
}

export async function handleAcceptCommand(userId: string, args: string[]): Promise<string> {
  try {
    logger.info(`✅ [ACCEPT] !accept from: ${userId}, args: ${args.join(' ')}`);
    
    const duelId = args[0];
    if (!duelId) {
      return 'Usage: !accept <duel_id>';
    }
    
    logger.info(`✅ [ACCEPT] Accepting duel: ${duelId}`);
    const duel = acceptDuel(duelId, userId);
    
    if (!duel) {
      logger.warn(`✅ [ACCEPT] Duel not found or invalid: ${duelId}`);
      return '❌ Duel not found or already accepted.';
    }
    
    logger.info(`✅ [ACCEPT] Duel accepted: ${duel.id}`);
    
    const baseUrl = process.env.PUBLIC_BASE_URL || process.env.BASE_URL || 'http://localhost:3000';
    const duelUrl = `${baseUrl}/duel/${duel.id}`;
    
    const response = `✅ Duel accepted!\n\nChallenge: ${duelUrl}`;
    logger.info(`✅ [ACCEPT] Response generated (${response.length} chars)`);
    return response;
  } catch (error: any) {
    logger.error('❌ [ACCEPT] Error handling accept command:', error);
    return '❌ Error accepting duel. Please try again.';
  }
}

export async function handleDuelStatusCommand(userId: string, args: string[]): Promise<string> {
  try {
    logger.info(`📊 [STATUS] !duel_status from: ${userId}`);
    
    const duels = getUserDuels(userId);
    const active = duels.filter(d => d.status === 'active' || d.status === 'pending');
    const finished = duels.filter(d => d.status === 'finished');
    
    if (active.length === 0 && finished.length === 0) {
      return 'No duels. Create: !duel @user';
    }
    
    let message = '';
    
    if (active.length > 0) {
      message += `⚔️ Active (${active.length})\n\n`;
      active.slice(0, 3).forEach(duel => {
        const opponent = duel.challengerId === userId ? duel.opponentId : duel.challengerId;
        message += `${formatUserId(opponent)} - ${duel.status}\n`;
        if (duel.scores[userId] !== undefined) {
          message += `Score: ${duel.scores[userId]}/100\n`;
        }
        message += `${BASE_URL}/duel/${duel.id}\n\n`;
      });
    }
    
    if (finished.length > 0) {
      message += `🏁 Finished (${finished.length})\n\n`;
      finished.slice(0, 3).forEach(duel => {
        const opponent = duel.challengerId === userId ? duel.opponentId : duel.challengerId;
        const yourScore = duel.scores[userId] || 0;
        const oppScore = duel.scores[opponent] || 0;
        const result = yourScore > oppScore ? '✅' : yourScore < oppScore ? '❌' : '🤝';
        message += `${result} ${yourScore} vs ${oppScore}\n\n`;
      });
    }
    
    logger.info(`📊 [STATUS] Response generated (${message.length} chars)`);
    return message;
  } catch (error: any) {
    logger.error('❌ [STATUS] Error:', error);
    return '❌ Error fetching status. Please try again.';
  }
}
