import { UserState, UserMetrics } from './types';
import { getConfig } from '../config/domainConfig';
import { updateUserState } from './userStore';

/**
 * Stat Engine
 * Handles stat updates, overallScore calculation, and tier determination
 */
export function updateUserStats(userId: string): UserState {
  const user = updateUserState(userId, {});
  const overallScore = calculateOverallScore(user);
  const tier = determineTier(user.finalElo);
  
  return updateUserState(userId, {
    overallScore,
    tier,
  });
}

export function calculateOverallScore(userState: UserState): number {
  // Calculate overall score (0-99) from UserMetrics
  const metrics = userState.metrics;
  const avg = (
    metrics.technical +
    metrics.strategy +
    metrics.execution +
    metrics.aura +
    metrics.experience
  ) / 5;
  
  return Math.round(avg);
}

export function determineTier(finalElo: number): string {
  const config = getConfig();
  const tiers = Object.entries(config.tiers).reverse();
  
  for (const [tier, range] of tiers) {
    if (range.maxRating === null || finalElo <= range.maxRating) {
      if (finalElo >= range.minRating) {
        return tier.charAt(0).toUpperCase() + tier.slice(1); // Capitalize
      }
    }
  }
  
  return 'Bronze';
}

export function updateMetric(
  userId: string,
  metric: keyof UserMetrics,
  delta: number
): void {
  const user = updateUserState(userId, {});
  const currentValue = user.metrics[metric];
  const newValue = Math.max(0, Math.min(100, currentValue + delta));
  
  updateUserState(userId, {
    metrics: {
      ...user.metrics,
      [metric]: newValue,
    },
  });
  
  // Recalculate overall score and tier
  updateUserStats(userId);
}
