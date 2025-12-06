import { Challenge, ArchetypeId, Duel, Submission } from '../types';
import { generateChallenge } from './generator';
import { gradeSubmission } from './grader';
import { logger } from '../../utils/logging';

/**
 * Challenge Engine
 * Orchestrates challenge generation and grading
 */
export async function startChallengeForDuel(duel: Duel): Promise<Challenge> {
  logger.info(`Starting challenge for duel ${duel.id} (${duel.archetype}, ${duel.metric})`);
  const challenge = await generateChallenge(duel.archetype, duel.metric);
  challenge.duelId = duel.id;
  return challenge;
}

export async function gradeSubmissionForDuel(
  duel: Duel,
  submission: Submission
): Promise<number> {
  logger.info(`Grading submission for duel ${duel.id} by user ${submission.userId}`);
  
  // Create challenge object from duel
  const challenge: Challenge = {
    id: `${duel.id}-challenge`,
    duelId: duel.id,
    archetype: duel.archetype,
    metric: duel.metric,
    title: `${duel.archetype} Challenge`,
    prompt: `Complete the ${duel.metric} challenge for ${duel.archetype}`,
    difficulty: 'medium',
    createdAt: duel.createdAt,
  };
  
  return await gradeSubmission(challenge, submission, duel.archetype);
}

// Legacy exports for backward compatibility
export async function createChallenge(
  archetype: ArchetypeId,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  templateId?: string
): Promise<Challenge> {
  logger.info(`Generating ${archetype} challenge (difficulty: ${difficulty})`);
  return await generateChallenge(archetype, 'technical', templateId);
}

export async function evaluateSubmission(
  challenge: Challenge,
  submission: string,
  archetype: ArchetypeId
): Promise<number> {
  logger.info(`Grading submission for challenge ${challenge.id}`);
  const submissionObj: Submission = {
    id: `${Date.now()}`,
    duelId: challenge.duelId,
    userId: '',
    answer: submission,
    submittedAt: Date.now(),
  };
  return await gradeSubmission(challenge, submissionObj, archetype);
}
