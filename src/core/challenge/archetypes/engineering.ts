import { Challenge } from '../../types';
import { generateId } from '../../../utils/validation';

export function generateFromTemplate(
  template: any,
  difficulty: 'easy' | 'medium' | 'hard'
): Challenge {
  return {
    id: generateId(),
    archetype: 'engineering',
    title: template.title,
    description: template.description,
    difficulty: template.difficulty || difficulty,
    estimatedDuration: template.estimatedDuration || 30,
    testCases: template.testCases || [],
    starterCode: template.starterCode,
    hints: template.hints,
    templateId: template.id,
  };
}

export async function gradeSolution(challenge: Challenge, solution: string): Promise<number> {
  // TODO: Implement proper grading logic
  // For now, basic checks:
  // - Solution is not empty
  // - Solution contains expected patterns
  // - Run test cases if possible
  
  if (!solution || solution.trim().length === 0) {
    return 0;
  }
  
  // Basic heuristic: check if solution looks reasonable
  const hasFunction = /function\s+\w+|const\s+\w+\s*=\s*\(|=>/.test(solution);
  const hasReturn = /return/.test(solution);
  const hasLogic = solution.length > 50;
  
  let score = 0;
  if (hasFunction) score += 30;
  if (hasReturn) score += 20;
  if (hasLogic) score += 30;
  
  // TODO: Actually run test cases
  // For now, add some randomness to simulate partial correctness
  const randomBonus = Math.floor(Math.random() * 20);
  score += randomBonus;
  
  return Math.min(100, score);
}

