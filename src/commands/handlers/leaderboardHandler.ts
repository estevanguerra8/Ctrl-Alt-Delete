import { computeLeaderboard } from '../../core/leaderboardService';
import { logger } from '../../utils/logging';

/**
 * Leaderboard Handler
 * !leaderboard [metric] → View leaderboard
 */
export async function handleLeaderboardCommand(userId: string, args: string[]): Promise<string | null> {
  try {
    const metric = args[0] || 'blendedRating';
    const leaderboard = computeLeaderboard(metric);
    const top10 = leaderboard.slice(0, 10);
    
    let message = `🏆 Leaderboard (Top 10)\n\n`;
    top10.forEach((user, index) => {
      message += `${index + 1}. ${user.userId}: ${user.finalElo} Elo (${user.tier})\n`;
    });
    
    return message;
  } catch (error: any) {
    logger.error('Error handling leaderboard command:', error);
    return 'Error fetching leaderboard.';
  }
}
