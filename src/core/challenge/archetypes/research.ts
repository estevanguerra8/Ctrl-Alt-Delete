import { ArchetypeId, UserMetrics, Challenge } from '../../types';
import { generateId } from '../../../utils/validation';

/**
 * Research Archetype Implementation (STUB)
 * TODO: Implement full research challenge logic
 */

export function buildFallbackResearchChallenge(
  duelId: string,
  metric: keyof UserMetrics
): Challenge {
  return {
    id: generateId(),
    duelId,
    archetype: 'research',
    metric,
    title: `Research ${metric} Challenge`,
    prompt: `You are a research mentor. Create a short problem that tests ${metric} skills.

Focus on practical research scenarios.

Provide clear instructions and expected outcomes.`,
    difficulty: 'medium',
    createdAt: Date.now(),
  };
}
