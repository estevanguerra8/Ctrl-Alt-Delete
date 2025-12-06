import { ArchetypeId, UserMetrics, Challenge } from '../../types';
import { generateId } from '../../../utils/validation';

/**
 * Product Archetype Implementation (STUB)
 * TODO: Implement full product challenge logic
 */

export function buildFallbackProductChallenge(
  duelId: string,
  metric: keyof UserMetrics
): Challenge {
  return {
    id: generateId(),
    duelId,
    archetype: 'product',
    metric,
    title: `Product ${metric} Challenge`,
    prompt: `You are a product mentor. Create a short scenario that tests ${metric} skills.

Focus on practical product management scenarios.

Provide clear instructions and expected outcomes.`,
    difficulty: 'medium',
    createdAt: Date.now(),
  };
}
