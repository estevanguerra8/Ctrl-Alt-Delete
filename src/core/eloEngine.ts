import { UserState, Archetype } from './types';
import { getConfig } from '../config/domainConfig';
import { updateUserState, getUserState } from './userStore';

export interface EloResult {
  newRating: number;
  ratingChange: number;
}

export function calculateEloChange(
  playerRating: number,
  opponentRating: number,
  result: 'win' | 'loss' | 'draw'
): EloResult {
  const config = getConfig();
  const kFactor = config.elo.kFactor;
  
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  
  let actualScore: number;
  if (result === 'win') {
    actualScore = 1;
  } else if (result === 'loss') {
    actualScore = 0;
  } else {
    actualScore = 0.5;
  }
  
  const ratingChange = Math.round(kFactor * (actualScore - expectedScore));
  const newRating = Math.max(
    config.elo.minRating,
    Math.min(config.elo.maxRating, playerRating + ratingChange)
  );
  
  return {
    newRating,
    ratingChange,
  };
}

export function updateEloAfterDuel(
  challengerId: string,
  defenderId: string,
  archetype: Archetype,
  winnerId: string | null
): { challenger: UserState; defender: UserState } {
  const challenger = getUserState(challengerId);
  const defender = getUserState(defenderId);
  
  if (!challenger || !defender) {
    throw new Error('Users not found');
  }
  
  const challengerRating = challenger.stats[archetype].rating;
  const defenderRating = defender.stats[archetype].rating;
  
  let challengerResult: 'win' | 'loss' | 'draw';
  let defenderResult: 'win' | 'loss' | 'draw';
  
  if (winnerId === challengerId) {
    challengerResult = 'win';
    defenderResult = 'loss';
  } else if (winnerId === defenderId) {
    challengerResult = 'loss';
    defenderResult = 'win';
  } else {
    challengerResult = 'draw';
    defenderResult = 'draw';
  }
  
  const challengerElo = calculateEloChange(challengerRating, defenderRating, challengerResult);
  const defenderElo = calculateEloChange(defenderRating, challengerRating, defenderResult);
  
  const updatedChallenger = updateUserState(challengerId, {
    stats: {
      ...challenger.stats,
      [archetype]: {
        ...challenger.stats[archetype],
        rating: challengerElo.newRating,
      },
    },
  });
  
  const updatedDefender = updateUserState(defenderId, {
    stats: {
      ...defender.stats,
      [archetype]: {
        ...defender.stats[archetype],
        rating: defenderElo.newRating,
      },
    },
  });
  
  // Recalculate blended ratings
  recalculateBlendedRating(challengerId);
  recalculateBlendedRating(defenderId);
  
  return {
    challenger: updatedChallenger,
    defender: updatedDefender,
  };
}

export function recalculateBlendedRating(userId: string): UserState {
  const user = getUserState(userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  const config = getConfig();
  const enabledArchetypes = Object.entries(config.archetypes)
    .filter(([_, arch]) => arch.enabled)
    .map(([name]) => name as Archetype);
  
  if (enabledArchetypes.length === 0) {
    return updateUserState(userId, { blendedRating: user.stats.engineering.rating });
  }
  
  let totalWeight = 0;
  let weightedSum = 0;
  
  for (const arch of enabledArchetypes) {
    const archConfig = config.archetypes[arch];
    const rating = user.stats[arch].rating;
    weightedSum += rating * archConfig.weight;
    totalWeight += archConfig.weight;
  }
  
  const blendedRating = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  
  return updateUserState(userId, { blendedRating });
}

