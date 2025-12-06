import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Duel, Challenge, Submission } from './types';
import { generateId } from '../utils/validation';
import { logger } from '../utils/logging';
import { getOrCreateUserState, updateUserState } from './userStore';
import { updateMetric, updateUserStats } from './statEngine';
import { updateElo } from './eloEngine';
import { updateRanks } from './leaderboardService';
import { gradeSubmissionForDuel } from './challenge/engine';

const DATA_DIR = process.env.DATA_DIR || './data';
const DUELS_FILE = join(DATA_DIR, 'duels.json');

const duelStore = new Map<string, Duel>();

export function getDuel(duelId: string): Duel | null {
  return duelStore.get(duelId) || null;
}

export function createDuel(
  challengerId: string,
  opponentId: string,
  challenge: Challenge,
  archetype: string,
  durationMinutes: number
): Duel {
  const duel: Duel = {
    id: generateId(),
    archetype: archetype as any,
    metric: challenge.metric,
    challengerId,
    opponentId,
    createdAt: Date.now(),
    durationMinutes,
    status: 'pending',
    scores: {},
  };
  
  duelStore.set(duel.id, duel);
  saveDuels();
  
  return duel;
}

export function acceptDuel(duelId: string, opponentId: string): Duel | null {
  const duel = duelStore.get(duelId);
  if (!duel || duel.opponentId !== opponentId) {
    return null;
  }
  
  if (duel.status !== 'pending') {
    return null;
  }
  
  duel.status = 'active';
  duel.startTime = Date.now();
  duelStore.set(duelId, duel);
  saveDuels();
  
  return duel;
}

export async function submitDuelAnswer(duelId: string, userId: string, answer: string): Promise<Duel | null> {
  const duel = duelStore.get(duelId);
  if (!duel) {
    return null;
  }
  
  if (duel.status !== 'active') {
    return null;
  }
  
  // Create submission
  const submission: Submission = {
    id: generateId(),
    duelId,
    userId,
    answer,
    submittedAt: Date.now(),
  };
  
  // Grade the submission
  const score = await gradeSubmissionForDuel(duel, submission);
  submission.score = score;
  
  // Store score
  duel.scores[userId] = score;
  duelStore.set(duelId, duel);
  saveDuels();
  
  // Check if both have submitted
  const challengerScore = duel.scores[duel.challengerId];
  const opponentScore = duel.scores[duel.opponentId];
  
  if (challengerScore !== undefined && opponentScore !== undefined) {
    await finalizeDuel(duel);
  }
  
  return duel;
}

async function finalizeDuel(duel: Duel): Promise<void> {
  const challengerScore = duel.scores[duel.challengerId] || 0;
  const opponentScore = duel.scores[duel.opponentId] || 0;
  
  duel.status = 'finished';
  duel.endTime = Date.now();
  
  // Determine winner
  if (challengerScore > opponentScore) {
    // Challenger wins
    const challenger = getOrCreateUserState(duel.challengerId);
    const opponent = getOrCreateUserState(duel.opponentId);
    
    await updateElo(duel.challengerId, opponent.duelElo, 1);
    await updateElo(duel.opponentId, challenger.duelElo, 0);
    
    // Update metrics
    updateMetric(duel.challengerId, duel.metric, 5);
    updateMetric(duel.opponentId, duel.metric, -2);
  } else if (opponentScore > challengerScore) {
    // Opponent wins
    const challenger = getOrCreateUserState(duel.challengerId);
    const opponent = getOrCreateUserState(duel.opponentId);
    
    await updateElo(duel.challengerId, opponent.duelElo, 0);
    await updateElo(duel.opponentId, challenger.duelElo, 1);
    
    // Update metrics
    updateMetric(duel.challengerId, duel.metric, -2);
    updateMetric(duel.opponentId, duel.metric, 5);
  } else {
    // Draw
    const challenger = getOrCreateUserState(duel.challengerId);
    const opponent = getOrCreateUserState(duel.opponentId);
    
    await updateElo(duel.challengerId, opponent.duelElo, 0.5);
    await updateElo(duel.opponentId, challenger.duelElo, 0.5);
  }
  
  // Update stats and ranks
  updateUserStats(duel.challengerId);
  updateUserStats(duel.opponentId);
  updateRanks();
  
  duelStore.set(duel.id, duel);
  saveDuels();
}

export function getUserDuels(userId: string): Duel[] {
  return Array.from(duelStore.values()).filter(
    d => d.challengerId === userId || d.opponentId === userId
  );
}

export function loadDuels(): Promise<void> {
  return new Promise((resolve) => {
    try {
      if (!existsSync(DATA_DIR)) {
        mkdirSync(DATA_DIR, { recursive: true });
      }

      if (existsSync(DUELS_FILE)) {
        const data = readFileSync(DUELS_FILE, 'utf-8');
        const duels: Duel[] = JSON.parse(data);
        duelStore.clear();
        for (const duel of duels) {
          duelStore.set(duel.id, duel);
        }
        logger.info(`Loaded ${duels.length} duels from ${DUELS_FILE}`);
      } else {
        writeFileSync(DUELS_FILE, JSON.stringify([], null, 2), 'utf-8');
        logger.info(`Created new duels file at ${DUELS_FILE}`);
      }
    } catch (error) {
      logger.error('Error loading duels:', error);
    }
    resolve();
  });
}

export function saveDuels(): void {
  try {
    const duels = Array.from(duelStore.values());
    writeFileSync(DUELS_FILE, JSON.stringify(duels, null, 2), 'utf-8');
  } catch (error) {
    logger.error('Error saving duels:', error);
  }
}
