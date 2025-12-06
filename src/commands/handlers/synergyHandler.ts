import { getAllUsers, getOrCreateUserState } from '../../core/userStore';
import { UserState, UserMetrics } from '../../core/types';
import { logger } from '../../utils/logging';

/**
 * Synergy Handler
 * !synergy → Find users with stats that synergize well with your own
 * 
 * Matches users based on complementary strengths:
 * - If you're strong in technical, find someone strong in strategy/aura
 * - If you're strong in execution, find someone strong in experience/aura
 * - Complementary archetypes that work well together
 */
export async function handleSynergyCommand(userId: string, args: string[]): Promise<string> {
  try {
    logger.info(`✨ !synergy from: ${userId}`);
    
    const currentUser = getOrCreateUserState(userId);
    const allUsers = getAllUsers();
    
    // Filter out current user
    const otherUsers = allUsers.filter(u => u.userId !== userId);
    
    if (otherUsers.length === 0) {
      return 'No other users found. Invite friends to join!';
    }
    
    // Calculate synergy scores for each user
    const matches = otherUsers.map(user => {
      const synergy = calculateSynergy(currentUser, user);
      return { user, synergy };
    });
    
    // Sort by synergy (highest first)
    matches.sort((a, b) => b.synergy - a.synergy);
    
    // Get top 5 matches
    const topMatches = matches.slice(0, 5);
    
    if (topMatches.length === 0) {
      return 'No synergistic matches found.';
    }
    
    // Build response message
    let message = `✨ Synergistic Matches\n\n`;
    message += `Find teammates whose strengths complement yours!\n\n`;
    
    topMatches.forEach((match, index) => {
      const user = match.user;
      const synergyPercent = Math.round(match.synergy * 100);
      
      // Identify complementary strengths
      const complement = identifyComplementaryStrengths(currentUser.metrics, user.metrics);
      
      message += `${index + 1}. ${formatUserId(user.userId)} - ${synergyPercent}% synergy\n`;
      message += `   🏆 ${user.tier} | ⭐ ${user.finalElo} Elo | 📈 ${user.overallScore}/99\n`;
      message += `   💻 Tech: ${user.metrics.technical} | 🧠 Strategy: ${user.metrics.strategy}\n`;
      message += `   ⚡ Exec: ${user.metrics.execution} | ✨ Aura: ${user.metrics.aura}\n`;
      
      if (complement.length > 0) {
        message += `   🎯 Complements: ${complement.join(', ')}\n`;
      }
      
      if (user.archetype !== currentUser.archetype) {
        message += `   🔄 Different archetype: ${user.archetype} (complements ${currentUser.archetype})\n`;
      }
      
      message += `\n`;
    });
    
    message += `💡 Tip: Team up with complementary strengths for better results!`;
    
    logger.info(`✨ [SYNERGY] Response generated (${message.length} chars)`);
    return message;
  } catch (error: any) {
    logger.error(`❌ [SYNERGY] Error:`, error);
    return '❌ Error finding synergistic matches. Please try again.';
  }
}

/**
 * Calculate synergy between two users
 * Synergy = how well their strengths complement each other
 * Returns a score from 0 to 1 (1 = perfect complement, 0 = no synergy)
 */
function calculateSynergy(user1: UserState, user2: UserState): number {
  // Weight factors for different aspects
  const WEIGHT_COMPLEMENTARY_METRICS = 0.6;
  const WEIGHT_ARCHETYPE_SYNERGY = 0.2;
  const WEIGHT_OVERALL_BALANCE = 0.2;
  
  // Calculate complementary metrics score
  // High score when one user's strengths fill the other's weaknesses
  const complementaryScore = calculateComplementaryMetrics(user1.metrics, user2.metrics);
  
  // Archetype synergy (some archetypes work better together)
  const archetypeSynergy = calculateArchetypeSynergy(user1.archetype, user2.archetype);
  
  // Overall balance (both users should have decent overall scores, but different strengths)
  const overallBalance = calculateOverallBalance(user1, user2);
  
  // Weighted average
  const totalSynergy = 
    complementaryScore * WEIGHT_COMPLEMENTARY_METRICS +
    archetypeSynergy * WEIGHT_ARCHETYPE_SYNERGY +
    overallBalance * WEIGHT_OVERALL_BALANCE;
  
  return Math.max(0, Math.min(1, totalSynergy));
}

/**
 * Calculate how complementary two metric profiles are
 * High score when strengths/weaknesses complement each other
 */
function calculateComplementaryMetrics(metrics1: UserMetrics, metrics2: UserMetrics): number {
  const keys: (keyof UserMetrics)[] = ['technical', 'strategy', 'execution', 'aura', 'experience'];
  
  let totalComplement = 0;
  keys.forEach(key => {
    const val1 = metrics1[key];
    const val2 = metrics2[key];
    
    // If one is high and the other is low, that's complementary
    // If both are high or both are low, that's less complementary
    const diff = Math.abs(val1 - val2);
    const avg = (val1 + val2) / 2;
    
    // Higher complement when there's a significant difference
    // But both should be in reasonable ranges (not both terrible)
    if (avg > 40) { // At least one person is decent
      // Complement score: difference is good, but not too extreme
      const complement = Math.min(diff / 100, 1); // Normalize to 0-1
      totalComplement += complement;
    }
  });
  
  return totalComplement / keys.length;
}

/**
 * Calculate archetype synergy
 * Some archetypes work better together
 */
function calculateArchetypeSynergy(arch1: string, arch2: string): number {
  if (arch1 === arch2) {
    return 0.5; // Same archetype = moderate synergy
  }
  
  // Define synergistic pairs
  const synergisticPairs: Record<string, string[]> = {
    'engineering': ['product', 'research'],
    'finance': ['business_ops', 'product'],
    'creative': ['product', 'engineering'],
    'business_ops': ['finance', 'product'],
    'product': ['engineering', 'creative', 'business_ops'],
    'research': ['engineering', 'product'],
  };
  
  const complements = synergisticPairs[arch1] || [];
  if (complements.includes(arch2)) {
    return 1.0; // High synergy
  }
  
  return 0.3; // Different but not specifically synergistic
}

/**
 * Calculate overall balance
 * Both users should have decent overall scores but different strengths
 */
function calculateOverallBalance(user1: UserState, user2: UserState): number {
  // Both should have reasonable overall scores
  const minScore = Math.min(user1.overallScore, user2.overallScore);
  const maxScore = Math.max(user1.overallScore, user2.overallScore);
  
  // Bonus if both are decent (above 40)
  const bothDecent = minScore > 40 ? 0.5 : 0;
  
  // Bonus if scores are reasonably close (not too far apart)
  const scoreDiff = Math.abs(user1.overallScore - user2.overallScore);
  const closeScores = scoreDiff < 30 ? 0.5 : 0.3;
  
  return bothDecent + closeScores;
}

/**
 * Identify which strengths complement each other
 */
function identifyComplementaryStrengths(metrics1: UserMetrics, metrics2: UserMetrics): string[] {
  const complements: string[] = [];
  const pairs: Array<[keyof UserMetrics, string]> = [
    ['technical', 'Technical'],
    ['strategy', 'Strategy'],
    ['execution', 'Execution'],
    ['aura', 'Aura'],
    ['experience', 'Experience'],
  ];
  
  pairs.forEach(([key, label]) => {
    const val1 = metrics1[key];
    const val2 = metrics2[key];
    
    // If one is strong (>70) and the other is weak (<50), that's complementary
    if ((val1 > 70 && val2 < 50) || (val2 > 70 && val1 < 50)) {
      if (val1 > val2) {
        complements.push(`Your ${label} → Their ${label}`);
      } else {
        complements.push(`Their ${label} → Your ${label}`);
      }
    }
  });
  
  return complements;
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

