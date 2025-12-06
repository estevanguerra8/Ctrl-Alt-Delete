import { createDuel, acceptDuel, getDuel, getUserDuels } from '../../core/duelManager';
import { notifyDuelCreated, notifyDuelAccepted } from '../../core/notificationService';
import { sendSeriesMessage } from '../../messaging/seriesClient';
import { logger } from '../../utils/logging';
import { Archetype } from '../../core/types';
import { getEnabledArchetypes } from '../../config/domainConfig';

export async function handleDuelCommand(userId: string, args: string[]): Promise<void> {
  try {
    if (args.length < 2) {
      await sendSeriesMessage(
        userId,
        'Usage: !duel @user archetype duration\nExample: !duel @alice engineering 30m'
      );
      return;
    }
    
    const defenderMention = args[0]; // e.g., "@user123"
    const archetype = args[1] as Archetype;
    const durationStr = args[2] || '30m';
    
    // Extract user ID from mention (remove @)
    const defenderId = defenderMention.replace('@', '');
    
    // Validate archetype
    const enabledArchetypes = getEnabledArchetypes();
    if (!enabledArchetypes.includes(archetype)) {
      await sendSeriesMessage(
        userId,
        `Invalid archetype. Available: ${enabledArchetypes.join(', ')}`
      );
      return;
    }
    
    // Parse duration (e.g., "30m" -> 30)
    const durationMatch = durationStr.match(/(\d+)([mh])/);
    if (!durationMatch) {
      await sendSeriesMessage(userId, 'Invalid duration format. Use "30m" or "1h"');
      return;
    }
    
    const duration = parseInt(durationMatch[1]);
    const unit = durationMatch[2];
    const durationMinutes = unit === 'h' ? duration * 60 : duration;
    
    const duel = createDuel(userId, defenderId, archetype, durationMinutes);
    
    await sendSeriesMessage(
      userId,
      `Duel created! ID: ${duel.id}. Waiting for ${defenderMention} to accept.`
    );
    
    await notifyDuelCreated(duel);
  } catch (error: any) {
    logger.error('Error handling duel command:', error);
    await sendSeriesMessage(userId, `Error creating duel: ${error.message}`);
  }
}

export async function handleAcceptCommand(userId: string, args: string[]): Promise<void> {
  try {
    if (args.length < 1) {
      await sendSeriesMessage(userId, 'Usage: !accept duelId');
      return;
    }
    
    const duelId = args[0];
    const duel = await acceptDuel(duelId);
    
    if (duel.defenderId !== userId) {
      await sendSeriesMessage(userId, 'You are not the defender of this duel.');
      return;
    }
    
    await sendSeriesMessage(userId, `Duel accepted! Challenge generated.`);
    await notifyDuelAccepted(duel);
  } catch (error: any) {
    logger.error('Error handling accept command:', error);
    await sendSeriesMessage(userId, `Error accepting duel: ${error.message}`);
  }
}

export async function handleDuelStatusCommand(userId: string, args: string[]): Promise<void> {
  try {
    if (args.length < 1) {
      await sendSeriesMessage(userId, 'Usage: !duel_status duelId');
      return;
    }
    
    const duelId = args[0];
    const duel = getDuel(duelId);
    
    if (!duel) {
      await sendSeriesMessage(userId, 'Duel not found.');
      return;
    }
    
    if (duel.challengerId !== userId && duel.defenderId !== userId) {
      await sendSeriesMessage(userId, 'You are not part of this duel.');
      return;
    }
    
    const challengeUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/duel/${duel.id}`;
    let message = `⚔️ Duel Status: ${duel.status.toUpperCase()}\n`;
    message += `Archetype: ${duel.archetype}\n`;
    message += `Expires: ${new Date(duel.expiresAt).toLocaleString()}\n`;
    
    if (duel.status === 'active') {
      message += `\nComplete the challenge: ${challengeUrl}`;
    }
    
    if (duel.status === 'completed') {
      message += `\nWinner: ${duel.winnerId || 'Draw'}`;
    }
    
    await sendSeriesMessage(userId, message);
  } catch (error: any) {
    logger.error('Error handling duel status command:', error);
    await sendSeriesMessage(userId, `Error fetching duel status: ${error.message}`);
  }
}

