import { buildStatCardDTO } from '../../core/statcardModel';
import { getOrCreateUserState } from '../../core/userStore';
import { logger } from '../../utils/logging';

/**
 * Card Handler
 * !card → short summary + "check profile StatCard"
 */
export async function handleCardCommand(userId: string): Promise<string> {
  try {
    logger.info(`📊 [CARD] !card from: ${userId}`);
    
    const userState = getOrCreateUserState(userId);
    const statCard = buildStatCardDTO(userId);
    
    if (!statCard) {
      return '📊 You don\'t have a StatCard yet.\nComplete a duel to get started!';
    }
    
    // Build metrics display
    const metricsText = statCard.metrics
      .map(m => `${m.emoji} ${m.label}: ${m.value}/100`)
      .join('\n');
    
    const response = `📊 Your StatCard\n\n` +
      `🏆 Tier: ${statCard.tier}\n` +
      `⭐ Final Elo: ${statCard.finalElo}\n` +
      `📈 Overall Score: ${statCard.overallScore}/99\n` +
      `🎯 Archetype: ${statCard.archetypeName} ${statCard.primaryEmoji}\n\n` +
      `Metrics:\n${metricsText}`;
    
    logger.info(`📊 [CARD] Response generated (${response.length} chars)`);
    return response;
  } catch (error: any) {
    logger.error(`❌ [CARD] Error:`, error);
    return '❌ Error fetching StatCard. Please try again.';
  }
}
