import { createDuel, acceptDuel, getUserDuels } from '../../core/duelManager';
import { startChallengeForDuel } from '../../core/challenge/engine';
import { parseDuration } from '../../utils/validation';
import { logger } from '../../utils/logging';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/**
 * Duel Handler
 * !duel, !accept, !duel_status → creates duels + links
 */
export async function handleDuelCommand(userId: string, args: string[]): Promise<string | null> {
  try {
    if (args.length < 2) {
      return 'Usage: !duel @user <archetype> <duration>\nExample: !duel @user123 engineering 30m';
    }
    
    const opponentId = args[0].replace('@', '');
    const archetype = args[1] as any;
    const duration = args[2] || '30m';
    
    const durationMinutes = parseDuration(duration);
    
    // Create challenge for the duel
    // TODO: Generate proper challenge based on archetype and metric
    const challenge = await startChallengeForDuel({
      id: '',
      archetype,
      metric: 'technical', // Default metric
      challengerId: userId,
      opponentId,
      createdAt: Date.now(),
      durationMinutes,
      status: 'pending',
      scores: {},
    });
    
    const duel = createDuel(userId, opponentId, challenge, archetype, durationMinutes);
    
    return `Duel challenge sent! Link: ${BASE_URL}/duel/${duel.id}`;
  } catch (error: any) {
    logger.error('Error handling duel command:', error);
    return 'Error creating duel. Please try again.';
  }
}

export async function handleAcceptCommand(userId: string, args: string[]): Promise<string | null> {
  try {
    const duelId = args[0];
    if (!duelId) {
      return 'Usage: !accept <duel_id>';
    }
    
    const duel = acceptDuel(duelId, userId);
    if (!duel) {
      return 'Duel not found or already accepted.';
    }
    
    return `Duel accepted! Submit your answer: ${BASE_URL}/duel/${duel.id}`;
  } catch (error: any) {
    logger.error('Error handling accept command:', error);
    return 'Error accepting duel.';
  }
}

export async function handleDuelStatusCommand(userId: string, args: string[]): Promise<string | null> {
  try {
    const duels = getUserDuels(userId);
    const active = duels.filter(d => d.status === 'active' || d.status === 'pending');
    
    if (active.length === 0) {
      return 'No active duels.';
    }
    
    let message = `⚔️ Your Active Duels\n\n`;
    active.forEach(duel => {
      message += `${duel.id}: ${duel.status} (${duel.archetype}, ${duel.metric})\n`;
      message += `Link: ${BASE_URL}/duel/${duel.id}\n\n`;
    });
    
    return message;
  } catch (error: any) {
    logger.error('Error handling duel status command:', error);
    return 'Error fetching duel status.';
  }
}
