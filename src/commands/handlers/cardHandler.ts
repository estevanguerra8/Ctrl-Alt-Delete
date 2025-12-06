import { buildStatCardDTO } from '../../core/statcardModel';
import { sendSeriesMessage } from '../../messaging/seriesClient';
import { logger } from '../../utils/logging';

export async function handleCardCommand(userId: string): Promise<void> {
  try {
    const statCard = buildStatCardDTO(userId);
    
    if (!statCard) {
      await sendSeriesMessage(userId, 'You don\'t have a StatCard yet. Complete a duel to get started!');
      return;
    }
    
    const summary = `📊 Your StatCard:\n` +
      `Tier: ${statCard.tier.toUpperCase()}\n` +
      `Rating: ${statCard.blendedRating}\n` +
      `Rank: #${statCard.rank}\n` +
      `Total Duels: ${statCard.totalDuels}\n` +
      `\nCheck your full profile StatCard on your Series profile!`;
    
    await sendSeriesMessage(userId, summary);
  } catch (error) {
    logger.error('Error handling card command:', error);
    await sendSeriesMessage(userId, 'Error fetching your StatCard. Please try again later.');
  }
}

