import { getLeaderboard } from '../../core/leaderboardService';
import { sendSeriesMessage } from '../../messaging/seriesClient';
import { logger } from '../../utils/logging';

export async function handleLeaderboardCommand(userId: string, args: string[]): Promise<void> {
  try {
    const archetype = args[0]; // Optional archetype filter
    const entries = getLeaderboard(archetype);
    
    if (entries.length === 0) {
      await sendSeriesMessage(userId, 'No leaderboard data available yet.');
      return;
    }
    
    const top10 = entries.slice(0, 10);
    let message = '🏆 Leaderboard (Top 10):\n\n';
    
    for (const entry of top10) {
      const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : '  ';
      message += `${medal} #${entry.rank} - Rating: ${entry.blendedRating} (${entry.tier})\n`;
    }
    
    const userEntry = entries.find((e) => e.userId === userId);
    if (userEntry) {
      message += `\nYour rank: #${userEntry.rank}`;
    }
    
    await sendSeriesMessage(userId, message);
  } catch (error) {
    logger.error('Error handling leaderboard command:', error);
    await sendSeriesMessage(userId, 'Error fetching leaderboard. Please try again later.');
  }
}

