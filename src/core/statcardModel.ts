import { StatCardDTO, UserState, Archetype } from './types';
import { getUserState } from './userStore';

export function buildStatCardDTO(userId: string): StatCardDTO | null {
  const user = getUserState(userId);
  if (!user) {
    return null;
  }
  
  const stats: Record<Archetype, any> = {} as any;
  const archetypes: Archetype[] = ['engineering', 'finance', 'creative', 'business_ops', 'product', 'research'];
  
  for (const arch of archetypes) {
    const stat = user.stats[arch];
    const total = stat.wins + stat.losses + stat.draws;
    const winRate = total > 0 ? (stat.wins / total) * 100 : 0;
    
    stats[arch] = {
      rating: stat.rating,
      wins: stat.wins,
      losses: stat.losses,
      draws: stat.draws,
      winRate: Math.round(winRate * 100) / 100,
    };
  }
  
  return {
    userId: user.userId,
    tier: user.tier,
    blendedRating: user.blendedRating,
    rank: user.rank,
    stats,
    totalDuels: user.totalDuels,
    lastUpdated: user.updatedAt,
  };
}

