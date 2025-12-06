import { buildStatCardDTO } from '../../core/statcardModel';
import { getOrCreateUserState } from '../../core/userStore';
import { logger } from '../../utils/logging';

/**
 * Card Handler
 * !card → short summary + "check profile StatCard"
 */
export async function handleCardCommand(userId: string): Promise<string | null> {
  try {
    logger.info(`📊 !card from: ${userId}`);
    
    const userState = getOrCreateUserState(userId);
    const statCard = buildStatCardDTO(userId);
    
    if (!statCard) {
      return 'You don\'t have a StatCard yet. Complete a duel to get started!';
    }
    
    const response = `📊 Your StatCard\n\n` +
      `🏆 Tier: ${statCard.tier}\n` +
      `⭐ Final Elo: ${statCard.finalElo}\n` +
      `📈 Overall Score: ${statCard.overallScore}/99\n` +
      `\nCheck your full profile StatCard: /api/statcard/${userId}`;
    
    return response;
  } catch (error: any) {
    logger.error(`❌ Error in !card:`, error);
    return 'Sorry, there was an error fetching your StatCard. Please try again.';
  }
}
