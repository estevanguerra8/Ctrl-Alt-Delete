import { Challenge, Submission, ArchetypeId } from '../types';
import { logger } from '../../utils/logging';

/**
 * Challenge Grader
 * Grades submissions (0–100) using simple logic/LLM client
 */
export async function gradeSubmission(
  challenge: Challenge,
  submission: Submission,
  archetype: ArchetypeId
): Promise<number> {
  // Use archetype-specific grader if available
  try {
    const archetypeModule = await import(`./archetypes/${archetype}`);
    if (archetypeModule.gradeSubmission) {
      return await archetypeModule.gradeSubmission(challenge, submission);
    }
  } catch (error) {
    logger.warn(`No specific grader for ${archetype}, using default`);
  }
  
  // Default grading: simple heuristic
  return defaultGrade(challenge, submission);
}

function defaultGrade(challenge: Challenge, submission: Submission): number {
  if (!submission.answer || submission.answer.trim().length === 0) {
    return 0;
  }
  
  // Basic scoring: 50 base + up to 50 for quality
  let score = 50;
  
  // Check if submission addresses the challenge
  const keywords = challenge.prompt.toLowerCase().split(/\s+/);
  const submissionLower = submission.answer.toLowerCase();
  const matches = keywords.filter((k: string) => submissionLower.includes(k)).length;
  score += Math.min(30, (matches / keywords.length) * 30);
  
  // Length bonus (up to 20 points)
  if (submission.answer.length > 100) {
    score += Math.min(20, (submission.answer.length - 100) / 10);
  }
  
  return Math.min(100, Math.round(score));
}
