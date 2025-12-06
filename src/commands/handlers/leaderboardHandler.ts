import { computeLeaderboard } from '../../core/leaderboardService';
import { logger } from '../../utils/logging';

/**
 * Leaderboard Handler
 * !leaderboard [metric] → View leaderboard
 */
export async function handleLeaderboardCommand(userId: string, args: string[]): Promise<string> {
  try {
    logger.info(`🏆 [LEADERBOARD] !leaderboard from: ${userId}`);
    
    const metric = args[0] || 'finalElo';
    const leaderboard = computeLeaderboard(metric);
    const top10 = leaderboard.slice(0, 10);
    
    if (top10.length === 0) {
      return '🏆 No users on leaderboard yet.\nBe the first!';
    }
    
    // Get user's rank
    const userRank = leaderboard.findIndex(u => u.userId === userId) + 1;
    
    let message = `🏆 Leaderboard\n\n`;
    
    top10.forEach((user, index) => {
      const rank = index + 1;
      const isCurrentUser = user.userId === userId;
      const prefix = isCurrentUser ? '👉 ' : `${rank}. `;
      
      message += `${prefix}${formatUserId(user.userId)} - ${user.finalElo} Elo (${user.tier})\n`;
    });
    
    if (userRank > 10) {
      message += `\n📊 Your rank: #${userRank}`;
    }
    
    logger.info(`🏆 [LEADERBOARD] Response generated (${message.length} chars)`);
    return message;
  } catch (error: any) {
    logger.error('❌ [LEADERBOARD] Error:', error);
    return '❌ Error fetching leaderboard. Please try again.';
  }
}

/**
 * Format user ID for display
 */
function formatUserId(userId: string): string {
  // If it's a phone number, show last 4 digits only
  if (/^\+?\d+$/.test(userId)) {
    const last4 = userId.slice(-4);
    return `***${last4}`;
  }
  // Otherwise show first 8 chars
  return userId.length > 8 ? userId.substring(0, 8) + '...' : userId;
}
