import { LeaderboardEntry } from './types';
import { getAllUsers } from './userStore';
import { updateUserState } from './userStore';

export function getLeaderboard(archetype?: string): LeaderboardEntry[] {
  const users = getAllUsers();
  
  let entries: LeaderboardEntry[] = users.map((user) => ({
    userId: user.userId,
    blendedRating: user.blendedRating,
    rank: user.rank,
    tier: user.tier,
    totalDuels: user.totalDuels,
  }));
  
  // Sort by blended rating (descending)
  entries.sort((a, b) => b.blendedRating - a.blendedRating);
  
  // Assign ranks
  entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });
  
  // Update ranks in user store
  for (const entry of entries) {
    updateUserState(entry.userId, { rank: entry.rank });
  }
  
  return entries;
}

export function getRankChange(userId: string, previousRank: number, currentRank: number): number {
  return previousRank - currentRank; // Positive = moved up, negative = moved down
}

