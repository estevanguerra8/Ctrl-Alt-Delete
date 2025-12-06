import { ArchetypeId, UserMetrics, Challenge } from '../../types';
import { generateId } from '../../../utils/validation';

/**
 * Creative Archetype Implementation (STUB)
 * TODO: Implement full creative challenge logic
 */

export function buildFallbackCreativeChallenge(
  duelId: string,
  metric: keyof UserMetrics
): Challenge {
  return {
    id: generateId(),
    duelId,
    archetype: 'creative',
    metric,
    title: `Creative ${metric} Challenge`,
    prompt: `You are a creative mentor. Create a short project brief that tests ${metric} skills.

Focus on practical, real-world creative scenarios.

Provide clear instructions and expected outcomes.`,
    difficulty: 'medium',
    createdAt: Date.now(),
  };
}
