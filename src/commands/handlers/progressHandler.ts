import { getUserState } from '../../core/userStore';
import { logger } from '../../utils/logging';

/**
 * Progress Handler
 * !progress → self vs past self
 */
export async function handleProgressCommand(userId: string): Promise<string> {
  try {
    logger.info(`📈 [PROGRESS] !progress from: ${userId}`);
    
    const user = getUserState(userId);
    
    if (!user) {
      return '📈 No progress data found.\nComplete a duel to get started!';
    }
    
    const message = `📈 Your Progress\n\n` +
      `🏆 Tier: ${user.tier}\n` +
      `⭐ Elo: ${user.finalElo}\n` +
      `📈 Score: ${user.overallScore}/99\n` +
      `🔥 Streak: ${user.streakDays} days\n\n` +
      `Metrics:\n` +
      `💻 Technical: ${user.metrics.technical}\n` +
      `🧠 Strategy: ${user.metrics.strategy}\n` +
      `⚡ Execution: ${user.metrics.execution}\n` +
      `✨ Aura: ${user.metrics.aura}\n` +
      `🌟 Experience: ${user.metrics.experience}`;
    
    logger.info(`📈 [PROGRESS] Response generated (${message.length} chars)`);
    return message;
  } catch (error: any) {
    logger.error('❌ [PROGRESS] Error:', error);
    return '❌ Error fetching progress. Please try again.';
  }
}
