import { getUserState } from '../../core/userStore';
import { logger } from '../../utils/logging';

/**
 * Progress Handler
 * !progress → self vs past self
 */
export async function handleProgressCommand(userId: string): Promise<string | null> {
  try {
    const user = getUserState(userId);
    
    if (!user) {
      return 'No progress data found.';
    }
    
    const message = `📈 Your Progress\n\n` +
      `Current Tier: ${user.tier}\n` +
      `Final Elo: ${user.finalElo}\n` +
      `Overall Score: ${user.overallScore}/99\n` +
      `Streak: ${user.streakDays} days\n\n` +
      `Metrics:\n` +
      `  💻 Technical: ${user.metrics.technical}\n` +
      `  🧠 Strategy: ${user.metrics.strategy}\n` +
      `  ⚡ Execution: ${user.metrics.execution}\n` +
      `  ✨ Aura: ${user.metrics.aura}\n` +
      `  🌟 Experience: ${user.metrics.experience}\n\n` +
      `Keep dueling to improve!`;
    
    return message;
  } catch (error: any) {
    logger.error('Error handling progress command:', error);
    return 'Error fetching progress.';
  }
}
