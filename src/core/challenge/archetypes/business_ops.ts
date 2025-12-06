import { ArchetypeId, UserMetrics, Challenge } from '../../types';
import { generateId } from '../../../utils/validation';

/**
 * Business Ops Archetype Implementation (STUB)
 * TODO: Implement full business_ops challenge logic
 */

export function buildFallbackBusinessOpsChallenge(
  duelId: string,
  metric: keyof UserMetrics
): Challenge {
  return {
    id: generateId(),
    duelId,
    archetype: 'business_ops',
    metric,
    title: `Business Ops ${metric} Challenge`,
    prompt: `You are a business operations mentor. Create a short case study that tests ${metric} skills.

Focus on practical operational scenarios.

Provide clear instructions and expected outcomes.`,
    difficulty: 'medium',
    createdAt: Date.now(),
  };
}
