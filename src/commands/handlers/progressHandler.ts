import { getUserState } from '../../core/userStore';
import { sendSeriesMessage } from '../../messaging/seriesClient';
import { logger } from '../../utils/logging';

export async function handleProgressCommand(userId: string): Promise<void> {
  try {
    const user = getUserState(userId);
    
    if (!user) {
      await sendSeriesMessage(userId, 'You don\'t have any progress data yet.');
      return;
    }
    
    const message = `📈 Your Progress:\n` +
      `Total Duels: ${user.totalDuels}\n` +
      `Current Rating: ${user.blendedRating}\n` +
      `Tier: ${user.tier.toUpperCase()}\n` +
      `Rank: #${user.rank}\n` +
      `\nMember since: ${new Date(user.createdAt).toLocaleDateString()}`;
    
    await sendSeriesMessage(userId, message);
  } catch (error) {
    logger.error('Error handling progress command:', error);
    await sendSeriesMessage(userId, 'Error fetching progress. Please try again later.');
  }
}

