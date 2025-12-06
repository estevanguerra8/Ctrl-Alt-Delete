import { UserState } from './types';
import { getAllUsers, updateUserState } from './userStore';

/**
 * Leaderboard Service
 * Computes leaderboards and detects rank changes
 */
export function computeLeaderboard(metric: string = 'finalElo'): UserState[] {
  const users = getAllUsers();
  
  return users.sort((a, b) => {
    if (metric === 'finalElo' || metric === 'blendedRating') {
      return b.finalElo - a.finalElo;
    }
    if (metric === 'overallScore') {
      return b.overallScore - a.overallScore;
    }
    // Sort by specific metric
    const metricKey = metric as keyof typeof a.metrics;
    if (metricKey in a.metrics) {
      return b.metrics[metricKey] - a.metrics[metricKey];
    }
    return b.finalElo - a.finalElo;
  });
}

export function updateRanks(): void {
  const leaderboard = computeLeaderboard();
  
  leaderboard.forEach((user, index) => {
    const newRank = index + 1;
    const currentRank = user.ranks.overall || 0;
    
    if (currentRank !== newRank) {
      updateUserState(user.userId, {
        ranks: {
          ...user.ranks,
          overall: newRank,
        },
      });
    }
  });
}

export function getUserRank(userId: string): number {
  const leaderboard = computeLeaderboard();
  const index = leaderboard.findIndex(u => u.userId === userId);
  return index >= 0 ? index + 1 : 0;
}
