import { ArchetypeId, UserMetrics, Challenge } from '../types';
import { pickTemplate, ChallengeTemplate } from './templates';
import { generateId } from '../../utils/validation';
import { logger } from '../../utils/logging';
import * as engineeringArchetype from './archetypes/engineering';

/**
 * Challenge Generator
 * Creates Challenge objects from templates/config
 */
export async function generateChallenge(
  duelId: string,
  archetype: ArchetypeId,
  metric: keyof UserMetrics
): Promise<Challenge> {
  // Step 1: Decide difficulty
  // For now, use "medium" as default, or could be based on metric/user level
  const difficulty: 'easy' | 'medium' | 'hard' = 'medium';

  // Step 2: Try to pick a template
  const template = pickTemplate(archetype, metric, difficulty);

  // Step 3: If template found, build challenge from it
  if (template) {
    if (archetype === 'engineering') {
      return engineeringArchetype.buildEngineeringChallengeFromTemplate(duelId, template);
    } else {
      // For other archetypes, build generic challenge from template
      return {
        id: generateId(),
        duelId,
        archetype,
        metric: template.metric,
        title: template.title,
        prompt: template.prompt,
        difficulty: template.difficulty,
        createdAt: Date.now(),
      };
    }
  }

  // Step 4: If no template, use fallback
  if (archetype === 'engineering') {
    return engineeringArchetype.buildFallbackEngineeringChallenge(duelId, metric);
  } else {
    // For other archetypes, create a generic LLM-style prompt stub
    // TODO: In production, call LLM to generate challenge prompt
    return {
      id: generateId(),
      duelId,
      archetype,
      metric,
      title: `${archetype} ${metric} Challenge`,
      prompt: `You are a ${archetype} mentor. Create a short case study or problem that tests ${metric} skills.

Focus on practical, real-world scenarios relevant to ${archetype} professionals.

Provide clear instructions and expected outcomes.`,
      difficulty,
      createdAt: Date.now(),
    };
  }
}
