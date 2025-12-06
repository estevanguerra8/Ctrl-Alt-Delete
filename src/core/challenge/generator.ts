import { Challenge, ArchetypeId } from '../types';
import { getTemplatesForArchetype, getTemplateById } from './templates';
import { generateId } from '../../utils/validation';
import { logger } from '../../utils/logging';

/**
 * Challenge Generator
 * Creates Challenge objects from templates/config
 */
export async function generateChallenge(
  archetype: ArchetypeId,
  metric: keyof import('../types').UserMetrics,
  templateId?: string
): Promise<Challenge> {
  let template: any;
  
  if (templateId) {
    template = getTemplateById(archetype, templateId);
  } else {
    const templates = getTemplatesForArchetype(archetype);
    if (templates.length === 0) {
      throw new Error(`No templates found for ${archetype}`);
    }
    template = templates[Math.floor(Math.random() * templates.length)];
  }
  
  if (!template) {
    throw new Error(`No template found for ${archetype}`);
  }
  
  // Use archetype-specific generator if available
  try {
    const archetypeModule = await import(`./archetypes/${archetype}`);
    if (archetypeModule.generateChallenge) {
      return archetypeModule.generateChallenge(template, metric);
    }
  } catch (error) {
    logger.warn(`No specific generator for ${archetype}, using default`);
  }
  
  // Default challenge generation
  return {
    id: generateId(),
    duelId: '', // Will be set when associated with a duel
    archetype,
    metric,
    title: template.title || `${archetype} Challenge`,
    prompt: template.description || template.prompt || `Complete the ${metric} challenge`,
    difficulty: template.difficulty || 'medium',
    createdAt: Date.now(),
  };
}
