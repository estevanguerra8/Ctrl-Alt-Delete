import { getAllUsers, getOrCreateUserState } from '../../core/userStore';
import { UserState, UserMetrics } from '../../core/types';
import { logger } from '../../utils/logging';

/**
 * Connect Handler
 * !connect → Find users with similar stats/skill sets
 * 
 * Matches users based on:
 * - Similar overall score
 * - Similar metric profiles
 * - Same archetype (optional)
 */
export async function handleConnectCommand(userId: string, args: string[]): Promise<string> {
  try {
    logger.info(`🔗 !connect from: ${userId}`);
    
    const currentUser = getOrCreateUserState(userId);
    const allUsers = getAllUsers();
    
    // Filter out current user
    const otherUsers = allUsers.filter(u => u.userId !== userId);
    
    if (otherUsers.length === 0) {
      return 'No other users found. Invite friends to join!';
    }
    
    // Calculate similarity scores for each user
    const matches = otherUsers.map(user => {
      const similarity = calculateSimilarity(currentUser, user);
      return { user, similarity };
    });
    
    // Sort by similarity (highest first)
    matches.sort((a, b) => b.similarity - a.similarity);
    
    // Get top 5 matches
    const topMatches = matches.slice(0, 5);
    
    if (topMatches.length === 0) {
      return 'No matching users found.';
    }
    
    // Build response message
    let message = `🔗 Users with Similar Stats\n\n`;
    
    topMatches.forEach((match, index) => {
      const user = match.user;
      const similarityPercent = Math.round(match.similarity * 100);
      
      message += `${index + 1}. ${formatUserId(user.userId)} - ${similarityPercent}% match\n`;
      message += `   🏆 ${user.tier} | ⭐ ${user.finalElo} Elo | 📈 ${user.overallScore}/99\n`;
      message += `   💻 Tech: ${user.metrics.technical} | 🧠 Strategy: ${user.metrics.strategy}\n`;
      message += `   ⚡ Exec: ${user.metrics.execution} | ✨ Aura: ${user.metrics.aura}\n`;
      
      if (user.archetype === currentUser.archetype) {
        message += `   🎯 Same archetype: ${user.archetype}\n`;
      }
      message += `\n`;
    });
    
    message += `💡 Tip: Challenge them with !duel @${topMatches[0].user.userId} ${currentUser.archetype} 30m`;
    
    logger.info(`🔗 [CONNECT] Response generated (${message.length} chars)`);
    return message;
  } catch (error: any) {
    logger.error(`❌ [CONNECT] Error:`, error);
    return '❌ Error finding connections. Please try again.';
  }
}

/**
 * Calculate similarity between two users
 * Returns a score from 0 to 1 (1 = identical, 0 = completely different)
 */
function calculateSimilarity(user1: UserState, user2: UserState): number {
  // Weight factors for different aspects
  const WEIGHT_OVERALL = 0.3;
  const WEIGHT_METRICS = 0.5;
  const WEIGHT_ARCHETYPE = 0.1;
  const WEIGHT_TIER = 0.1;
  
  // Overall score similarity (normalized to 0-1)
  const overallDiff = Math.abs(user1.overallScore - user2.overallScore) / 99;
  const overallSimilarity = 1 - overallDiff;
  
  // Metrics similarity (average of all metric differences)
  const metricsSimilarity = calculateMetricsSimilarity(user1.metrics, user2.metrics);
  
  // Archetype bonus (same archetype = 1, different = 0)
  const archetypeSimilarity = user1.archetype === user2.archetype ? 1 : 0;
  
  // Tier similarity (same tier = 1, adjacent = 0.5, far = 0)
  const tierSimilarity = calculateTierSimilarity(user1.tier, user2.tier);
  
  // Weighted average
  const totalSimilarity = 
    overallSimilarity * WEIGHT_OVERALL +
    metricsSimilarity * WEIGHT_METRICS +
    archetypeSimilarity * WEIGHT_ARCHETYPE +
    tierSimilarity * WEIGHT_TIER;
  
  return Math.max(0, Math.min(1, totalSimilarity));
}

/**
 * Calculate similarity between two metric profiles
 */
function calculateMetricsSimilarity(metrics1: UserMetrics, metrics2: UserMetrics): number {
  const keys: (keyof UserMetrics)[] = ['technical', 'strategy', 'execution', 'aura', 'experience'];
  
  let totalDiff = 0;
  keys.forEach(key => {
    const diff = Math.abs(metrics1[key] - metrics2[key]) / 100;
    totalDiff += diff;
  });
  
  const avgDiff = totalDiff / keys.length;
  return 1 - avgDiff;
}

/**
 * Calculate tier similarity
 */
function calculateTierSimilarity(tier1: string, tier2: string): number {
  if (tier1 === tier2) return 1;
  
  const tiers = ['Bronze', 'Silver', 'Gold', 'Diamond', 'Mythic'];
  const index1 = tiers.indexOf(tier1);
  const index2 = tiers.indexOf(tier2);
  
  if (index1 === -1 || index2 === -1) return 0;
  
  const diff = Math.abs(index1 - index2);
  if (diff === 1) return 0.5; // Adjacent tiers
  if (diff === 2) return 0.25; // Two tiers apart
  return 0; // Far apart
}

/**
 * Format user ID for display (mask phone numbers for privacy)
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

