import { UserState, Duel } from './types';
import { sendSeriesMessage } from '../messaging/seriesClient';
import { logger } from '../utils/logging';

export async function notifyTierUpgrade(userId: string, oldTier: string, newTier: string): Promise<void> {
  try {
    const message = `🎉 Congratulations! You've upgraded from ${oldTier} to ${newTier}! Check your StatCard with !card`;
    await sendSeriesMessage(userId, message);
  } catch (error) {
    logger.error('Error sending tier upgrade notification:', error);
  }
}

export async function notifyRankChange(userId: string, rankChange: number): Promise<void> {
  try {
    if (rankChange > 0) {
      const message = `📈 You moved up ${rankChange} rank${rankChange > 1 ? 's' : ''}! Check your StatCard with !card`;
      await sendSeriesMessage(userId, message);
    } else if (rankChange < 0) {
      const message = `📉 You moved down ${Math.abs(rankChange)} rank${Math.abs(rankChange) > 1 ? 's' : ''}. Keep practicing!`;
      await sendSeriesMessage(userId, message);
    }
  } catch (error) {
    logger.error('Error sending rank change notification:', error);
  }
}

export async function notifyDuelCreated(duel: Duel): Promise<void> {
  try {
    const message = `⚔️ Duel challenge received! Type !accept ${duel.id} to accept. Check status with !duel_status ${duel.id}`;
    await sendSeriesMessage(duel.defenderId, message);
  } catch (error) {
    logger.error('Error sending duel created notification:', error);
  }
}

export async function notifyDuelAccepted(duel: Duel): Promise<void> {
  try {
    const challengeUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/duel/${duel.id}`;
    const message = `✅ Duel accepted! Complete the challenge here: ${challengeUrl}`;
    await sendSeriesMessage(duel.challengerId, message);
    await sendSeriesMessage(duel.defenderId, message);
  } catch (error) {
    logger.error('Error sending duel accepted notification:', error);
  }
}

export async function notifyDuelCompleted(duel: Duel): Promise<void> {
  try {
    if (duel.winnerId) {
      const winnerMessage = `🏆 You won the duel! Your StatCard has been updated. Check it with !card`;
      const loserId = duel.winnerId === duel.challengerId ? duel.defenderId : duel.challengerId;
      const loserMessage = `😔 You lost the duel. Better luck next time! Check your StatCard with !card`;
      
      await sendSeriesMessage(duel.winnerId, winnerMessage);
      await sendSeriesMessage(loserId, loserMessage);
    } else {
      const message = `🤝 The duel ended in a draw! Check your StatCard with !card`;
      await sendSeriesMessage(duel.challengerId, message);
      await sendSeriesMessage(duel.defenderId, message);
    }
  } catch (error) {
    logger.error('Error sending duel completed notification:', error);
  }
}

