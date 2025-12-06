import { UserState, Archetype } from './types';
import { getTierForRating } from '../config/domainConfig';
import { updateUserState } from './userStore';

export function updateUserStats(
  userId: string,
  archetype: Archetype,
  wins: number,
  losses: number,
  draws: number
): UserState {
  const user = updateUserState(userId, {});
  const stat = user.stats[archetype];
  
  stat.wins += wins;
  stat.losses += losses;
  stat.draws += draws;
  stat.lastUpdated = new Date().toISOString();
  
  return updateUserState(userId, {
    stats: {
      ...user.stats,
      [archetype]: stat,
    },
    totalDuels: user.totalDuels + wins + losses + draws,
  });
}

export function recalculateTier(userId: string): UserState {
  const user = updateUserState(userId, {});
  const tier = getTierForRating(user.blendedRating);
  return updateUserState(userId, { tier });
}

