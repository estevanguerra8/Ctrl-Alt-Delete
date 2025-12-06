import { Challenge, Archetype } from '../types';
import { loadTemplates } from './templates';
import { generateId } from '../../utils/validation';
import { logger } from '../../utils/logging';
import * as engineeringArchetype from './archetypes/engineering';

export async function generateChallengeFromTemplate(
  archetype: Archetype,
  difficulty: 'easy' | 'medium' | 'hard'
): Promise<Challenge> {
  const templates = await loadTemplates();
  const archetypeTemplates = templates[archetype] || [];
  
  if (archetypeTemplates.length === 0) {
    throw new Error(`No templates available for archetype: ${archetype}`);
  }
  
  // Filter by difficulty if possible
  const filtered = archetypeTemplates.filter((t: any) => t.difficulty === difficulty);
  const candidates = filtered.length > 0 ? filtered : archetypeTemplates;
  
  // Pick random template
  const template = candidates[Math.floor(Math.random() * candidates.length)];
  
  // Use archetype-specific generator if available
  if (archetype === 'engineering') {
    return engineeringArchetype.generateFromTemplate(template, difficulty);
  }
  
  // Default template-based generation
  return {
    id: generateId(),
    archetype,
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

