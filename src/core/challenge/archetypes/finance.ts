import { ArchetypeId, UserMetrics, Challenge } from '../../types';
import { generateId } from '../../../utils/validation';

/**
 * Finance Archetype Implementation (STUB)
 * TODO: Implement full finance challenge logic
 */

export function buildFallbackFinanceChallenge(
  duelId: string,
  metric: keyof UserMetrics
): Challenge {
  return {
    id: generateId(),
    duelId,
    archetype: 'finance',
    metric,
    title: `Finance ${metric} Challenge`,
    prompt: `You are a finance mentor. Create a short case study about ${metric} in financial analysis.

Focus on practical scenarios relevant to finance professionals.

Provide clear instructions and expected outcomes.`,
    difficulty: 'medium',
    createdAt: Date.now(),
  };
}
