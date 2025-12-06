import { Duel, UserState, Archetype } from './types';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { generateId } from '../utils/validation';
import { minutesFromNow } from '../utils/time';
import { logger } from '../utils/logging';
import { getOrCreateUserState } from './userStore';
import { generateChallenge } from './challenge/engine';
import { gradeSubmission, determineWinner } from './challenge/grader';
import { updateEloAfterDuel } from './eloEngine';
import { updateUserStats } from './statEngine';
import { notifyDuelCompleted } from './notificationService';

const DATA_DIR = process.env.DATA_DIR || './data';
const DUELS_FILE = join(DATA_DIR, 'duels.json');

const duelStore = new Map<string, Duel>();

export function getDuel(duelId: string): Duel | null {
  return duelStore.get(duelId) || null;
}

export function createDuel(
  challengerId: string,
  defenderId: string,
  archetype: Archetype,
  durationMinutes: number
): Duel {
  const id = generateId();
  const now = new Date().toISOString();
  
  // Ensure both users exist
  getOrCreateUserState(challengerId);
  getOrCreateUserState(defenderId);
  
  const duel: Duel = {
    id,
    challengerId,
    defenderId,
    archetype,
    status: 'pending',
    challengeId: null,
    challenge: null,
    challengerSubmission: null,
    defenderSubmission: null,
    winnerId: null,
    createdAt: now,
    expiresAt: minutesFromNow(durationMinutes * 2), // Give 2x duration for both to complete
    completedAt: null,
  };
  
  duelStore.set(id, duel);
  saveDuels();
  return duel;
}

export async function acceptDuel(duelId: string): Promise<Duel> {
  const duel = duelStore.get(duelId);
  if (!duel) {
    throw new Error('Duel not found');
  }
  
  if (duel.status !== 'pending') {
    throw new Error('Duel is not pending');
  }
  
  // Generate challenge
  const challenge = await generateChallenge(duel.archetype, 'medium', duel.expiresAt);
  
  duel.status = 'active';
  duel.challengeId = challenge.id;
  duel.challenge = challenge;
  
  duelStore.set(duelId, duel);
  saveDuels();
  return duel;
}

export async function submitDuelSolution(
  duelId: string,
  userId: string,
  solution: string
): Promise<Duel> {
  const duel = duelStore.get(duelId);
  if (!duel) {
    throw new Error('Duel not found');
  }
  
  if (duel.status !== 'active') {
    throw new Error('Duel is not active');
  }
  
  if (duel.challengerId !== userId && duel.defenderId !== userId) {
    throw new Error('User is not part of this duel');
  }
  
  if (!duel.challenge) {
    throw new Error('Challenge not generated');
  }
  
  // Grade submission
  const score = await gradeSubmission(duel.challenge, solution);
  
  const submission = {
    userId,
    solution,
    submittedAt: new Date().toISOString(),
    score,
    gradedAt: new Date().toISOString(),
  };
  
  if (duel.challengerId === userId) {
    duel.challengerSubmission = submission;
  } else {
    duel.defenderSubmission = submission;
  }
  
  // Check if both have submitted
  if (duel.challengerSubmission && duel.defenderSubmission) {
    const winnerId = determineWinner(
      duel.challengerSubmission,
      duel.defenderSubmission
    );
    duel.winnerId = winnerId;
    duel.status = 'completed';
    duel.completedAt = new Date().toISOString();
    
    // Finalize duel: update Elo and stats
    await finalizeDuel(duel);
  }
  
  duelStore.set(duelId, duel);
  saveDuels();
  return duel;
}

export function getUserDuels(userId: string): Duel[] {
  return Array.from(duelStore.values()).filter(
    (d) => d.challengerId === userId || d.defenderId === userId
  );
}

export function loadDuels(): Promise<void> {
  return new Promise((resolve) => {
    try {
      if (existsSync(DUELS_FILE)) {
        const data = readFileSync(DUELS_FILE, 'utf-8');
        const duels: Duel[] = JSON.parse(data);
        duelStore.clear();
        for (const duel of duels) {
          duelStore.set(duel.id, duel);
        }
        logger.info(`Loaded ${duels.length} duels from ${DUELS_FILE}`);
      } else {
        logger.info(`No existing duel data found at ${DUELS_FILE}`);
      }
    } catch (error) {
      logger.error('Error loading duels:', error);
    }
    resolve();
  });
}

async function finalizeDuel(duel: Duel): Promise<void> {
  try {
    // Update Elo ratings
    const { challenger, defender } = updateEloAfterDuel(
      duel.challengerId,
      duel.defenderId,
      duel.archetype,
      duel.winnerId
    );
    
    // Update win/loss/draw stats
    if (duel.winnerId === duel.challengerId) {
      updateUserStats(duel.challengerId, duel.archetype, 1, 0, 0);
      updateUserStats(duel.defenderId, duel.archetype, 0, 1, 0);
    } else if (duel.winnerId === duel.defenderId) {
      updateUserStats(duel.challengerId, duel.archetype, 0, 1, 0);
      updateUserStats(duel.defenderId, duel.archetype, 1, 0, 0);
    } else {
      // Draw
      updateUserStats(duel.challengerId, duel.archetype, 0, 0, 1);
      updateUserStats(duel.defenderId, duel.archetype, 0, 0, 1);
    }
    
    // Send notifications
    await notifyDuelCompleted(duel);
    
    logger.info(`Duel ${duel.id} finalized. Winner: ${duel.winnerId || 'Draw'}`);
  } catch (error) {
    logger.error('Error finalizing duel:', error);
  }
}

export function saveDuels(): void {
  try {
    const duels = Array.from(duelStore.values());
    writeFileSync(DUELS_FILE, JSON.stringify(duels, null, 2), 'utf-8');
  } catch (error) {
    logger.error('Error saving duels:', error);
  }
}

