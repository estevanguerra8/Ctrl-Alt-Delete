import { Challenge, Submission } from '../types';
import { createLLMClient } from '../llmClient';
import { logger } from '../../utils/logging';

const llm = createLLMClient();

export interface GradingResult {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

/**
 * Challenge Grader
 * Grades submissions (0–100) with detailed feedback
 */
export async function gradeSubmission(
  challenge: Challenge,
  submission: Submission
): Promise<GradingResult> {
  try {
    // Use LLM client to grade the submission with feedback
    // The LLM now returns full GradingFeedback with score, feedback, strengths, improvements
    const llmResult = await llm.gradeSubmission({
      archetype: challenge.archetype,
      metric: challenge.metric,
      challengePrompt: challenge.prompt,
      answer: submission.answer,
    });

    // LLM already returns complete feedback, use it directly
    return {
      score: llmResult.score,
      feedback: llmResult.feedback,
      strengths: llmResult.strengths,
      improvements: llmResult.improvements,
    };
  } catch (error: any) {
    logger.error('Error grading submission with LLM, using fallback:', error);
    // Fallback to simple heuristic if LLM fails
    return fallbackGradeWithFeedback(challenge, submission);
  }
}

/**
 * Generate detailed feedback for a submission
 */
async function generateFeedback(
  challenge: Challenge,
  submission: Submission,
  score: number
): Promise<{ feedback: string; strengths: string[]; improvements: string[] }> {
  // Use archetype-specific feedback generator if available
  try {
    const archetypeModule = await import(`./archetypes/${challenge.archetype}`);
    if (archetypeModule.generateFeedback) {
      return await archetypeModule.generateFeedback(challenge, submission, score);
    }
  } catch (error) {
    logger.debug(`No specific feedback generator for ${challenge.archetype}`);
  }
  
  // Default feedback generation
  return generateDefaultFeedback(challenge, submission, score);
}

/**
 * Generate default feedback
 */
function generateDefaultFeedback(
  challenge: Challenge,
  submission: Submission,
  score: number
): { feedback: string; strengths: string[]; improvements: string[] } {
  const strengths: string[] = [];
  const improvements: string[] = [];
  
  const answer = submission.answer.toLowerCase();
  const prompt = challenge.prompt.toLowerCase();
  
  // Check for key requirements
  if (answer.includes('complexity') || answer.includes('o(') || answer.includes('big o')) {
    strengths.push('Included complexity analysis');
  } else {
    improvements.push('Add time and space complexity analysis');
  }
  
  if (answer.includes('edge case') || answer.includes('empty') || answer.includes('negative')) {
    strengths.push('Addressed edge cases');
  } else {
    improvements.push('Consider edge cases (empty arrays, negative numbers, etc.)');
  }
  
  if (answer.length > 200) {
    strengths.push('Provided detailed explanation');
  } else if (answer.length < 100) {
    improvements.push('Provide more detail and explanation');
  }
  
  // Check for code structure
  if (answer.includes('def ') || answer.includes('function ') || answer.includes('class ')) {
    strengths.push('Included code implementation');
  } else {
    improvements.push('Include code implementation');
  }
  
  // Generate feedback message
  let feedback = `Your submission scored ${score}/100.\n\n`;
  
  if (strengths.length > 0) {
    feedback += `✅ Strengths:\n${strengths.map(s => `  • ${s}`).join('\n')}\n\n`;
  }
  
  if (improvements.length > 0) {
    feedback += `💡 Areas for improvement:\n${improvements.map(i => `  • ${i}`).join('\n')}\n\n`;
  }
  
  if (score >= 80) {
    feedback += 'Great work! Your solution demonstrates strong understanding.';
  } else if (score >= 60) {
    feedback += 'Good effort! Review the improvements above to enhance your solution.';
  } else {
    feedback += 'Keep practicing! Focus on the improvement areas to strengthen your solution.';
  }
  
  return { feedback, strengths, improvements };
}

/**
 * Fallback grading using simple heuristics with feedback
 */
function fallbackGradeWithFeedback(challenge: Challenge, submission: Submission): GradingResult {
  if (!submission.answer || submission.answer.trim().length === 0) {
    return {
      score: 0,
      feedback: 'No answer provided. Please submit a solution to receive feedback.',
      strengths: [],
      improvements: ['Provide a complete answer to the challenge'],
    };
  }

  let score = 50; // Base score

  // Check if submission addresses the challenge
  const keywords = challenge.prompt.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const submissionLower = submission.answer.toLowerCase();
  const matches = keywords.filter(k => submissionLower.includes(k)).length;
  score += Math.min(30, (matches / keywords.length) * 30);

  // Length bonus (up to 20 points)
  if (submission.answer.length > 100) {
    score += Math.min(20, (submission.answer.length - 100) / 10);
  }

  const finalScore = Math.min(100, Math.round(score));
  const feedback = generateDefaultFeedback(challenge, submission, finalScore);
  
  return {
    score: finalScore,
    ...feedback,
  };
}
