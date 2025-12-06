import { UserState } from './types';
import { getConfig } from '../config/domainConfig';
import { updateUserState, getUserState } from './userStore';
import { updateUserStats } from './statEngine';

// Lazy load K_FACTOR to avoid loading config at module level
function getKFactor(): number {
  return getConfig().elo.kFactor;
}

/**
 * Elo Engine
 * Handles Elo rating updates and finalElo blending
 */
export function calculateExpectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function updateElo(
  userId: string,
  opponentRating: number,
  actualScore: number // 1 for win, 0.5 for draw, 0 for loss
): number {
  const user = getUserState(userId);
  if (!user) {
    throw new Error(`User ${userId} not found`);
  }
  
  const currentRating = user.duelElo;
  const expectedScore = calculateExpectedScore(currentRating, opponentRating);
  const newRating = currentRating + getKFactor() * (actualScore - expectedScore);
  
  updateUserState(userId, {
    duelElo: Math.round(newRating),
  });
  
  // Recalculate finalElo (blended)
  const updatedUser = getUserState(userId)!;
  const finalElo = calculateFinalElo(updatedUser);
  updateUserState(userId, { finalElo });
  
  // Update stats
  updateUserStats(userId);
  
  return Math.round(newRating);
}

export function calculateFinalElo(userState: UserState): number {
  const config = getConfig();
  let blended = 0;
  let totalWeight = 0;
  
  // Blend based on archetype weights and metrics
  // For now, use a simple average of metrics weighted by archetype
  const metrics = userState.metrics;
  const metricAvg = (
    metrics.technical +
    metrics.strategy +
    metrics.execution +
    metrics.aura +
    metrics.experience
  ) / 5;
  
  // Combine duelElo with metric-based score
  blended = (userState.duelElo * 0.7) + (metricAvg * 10 * 0.3);
  
  return Math.round(blended);
}
