import { Challenge, Submission } from '../types';
import { logger } from '../../utils/logging';
import * as engineeringArchetype from './archetypes/engineering';

export async function gradeSubmission(
  challenge: Challenge,
  solution: string
): Promise<number> {
  // Use archetype-specific grader if available
  if (challenge.archetype === 'engineering') {
    return engineeringArchetype.gradeSolution(challenge, solution);
  }
  
  // Default grading (stub)
  logger.warn(`Grading not implemented for archetype: ${challenge.archetype}`);
  return 50; // Placeholder score
}

export function determineWinner(
  submission1: Submission,
  submission2: Submission
): string | null {
  if (!submission1.score || !submission2.score) {
    return null; // Can't determine winner without scores
  }
  
  if (submission1.score > submission2.score) {
    return submission1.userId;
  } else if (submission2.score > submission1.score) {
    return submission2.userId;
  } else {
    return null; // Draw
  }
}

