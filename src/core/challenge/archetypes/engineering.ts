import { Challenge, Submission } from '../../types';
import { generateId } from '../../../utils/validation';

/**
 * Engineering challenge implementation
 * Real implementation for engineering challenges
 */
export async function generateChallenge(template: any, metric: keyof import('../../types').UserMetrics): Promise<Challenge> {
  return {
    id: generateId(),
    duelId: '', // Will be set when associated with a duel
    archetype: 'engineering',
    metric,
    title: template.title || 'Engineering Challenge',
    prompt: template.description || template.prompt || 'Solve this engineering problem',
    difficulty: template.difficulty || 'medium',
    createdAt: Date.now(),
  };
}

export async function gradeSubmission(challenge: Challenge, submission: Submission): Promise<number> {
  if (!submission.answer || submission.answer.trim().length === 0) {
    return 0;
  }
  
  let score = 0;
  
  // Check for code structure
  const hasFunction = /function|def|const|let|var|class/.test(submission.answer);
  if (hasFunction) score += 20;
  
  // Check for algorithm keywords
  const algoKeywords = ['algorithm', 'complexity', 'optimize', 'efficient', 'data structure'];
  const hasAlgo = algoKeywords.some(k => submission.answer.toLowerCase().includes(k));
  if (hasAlgo) score += 20;
  
  // Check test case handling
  const handlesTests = submission.answer.includes('test') || submission.answer.includes('case');
  if (handlesTests) score += 20;
  
  // Code quality indicators
  const hasComments = /\/\/|\/\*|#/.test(submission.answer);
  if (hasComments) score += 10;
  
  const hasErrorHandling = /try|catch|error|exception/.test(submission.answer.toLowerCase());
  if (hasErrorHandling) score += 10;
  
  // Length and completeness
  if (submission.answer.length > 200) score += 10;
  if (submission.answer.length > 500) score += 10;
  
  return Math.min(100, score);
}
