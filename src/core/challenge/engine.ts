import { Duel, Challenge, Submission } from '../types';
import { generateChallenge } from './generator';
import { gradeSubmission } from './grader';
import { logger } from '../../utils/logging';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Challenge Engine
 * Orchestrates challenge generation and grading
 * Glues duels ↔ challenges ↔ grading
 */

// In-memory map from duelId → Challenge
const challengesByDuelId = new Map<string, Challenge>();

/**
 * Start a challenge for a duel
 * Generates or retrieves the challenge associated with a duel
 */
export async function startChallengeForDuel(duel: Duel): Promise<Challenge> {
  // If challenge already exists for duelId, return it
  const existing = challengesByDuelId.get(duel.id);
  if (existing) {
    logger.info(`Using existing challenge for duel ${duel.id}`);
    return existing;
  }

  // Generate new challenge
  logger.info(`Generating challenge for duel ${duel.id} (${duel.archetype}, ${duel.metric})`);
  const challenge = await generateChallenge(duel.id, duel.archetype, duel.metric);

  // Store in memory
  challengesByDuelId.set(duel.id, challenge);

  // Optionally persist under data/challenges/<archetype>/
  try {
    const challengesDir = join(process.cwd(), 'data', 'challenges', duel.archetype);
    if (!existsSync(challengesDir)) {
      mkdirSync(challengesDir, { recursive: true });
    }
    const challengeFile = join(challengesDir, `${challenge.id}.json`);
    writeFileSync(challengeFile, JSON.stringify(challenge, null, 2), 'utf-8');
    logger.debug(`Persisted challenge to ${challengeFile}`);
  } catch (error) {
    logger.warn('Could not persist challenge to disk:', error);
  }

  return challenge;
}

/**
 * Get challenge for a duel
 * Returns challenge from memory or loads from disk if available
 */
export async function getChallengeForDuel(duelId: string): Promise<Challenge | null> {
  // Check memory first
  const fromMemory = challengesByDuelId.get(duelId);
  if (fromMemory) {
    return fromMemory;
  }

  // TODO: Load from disk if persistence is implemented
  // For now, return null if not in memory
  return null;
}

/**
 * Grade a submission for a duel
 * Returns grading result with score and feedback
 */
export async function gradeSubmissionForDuel(
  duel: Duel,
  submission: Submission
): Promise<{ score: number; feedback: string; strengths: string[]; improvements: string[] }> {
  // Get Challenge for duel
  let challenge = await getChallengeForDuel(duel.id);
  
  if (!challenge) {
    // If challenge doesn't exist, generate it
    challenge = await startChallengeForDuel(duel);
  }

  // Call gradeSubmission (now returns GradingResult)
  const result = await gradeSubmission(challenge, submission);

  logger.info(`Graded submission for duel ${duel.id}: score = ${result.score}`);
  return result;
}
