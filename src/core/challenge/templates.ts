import { readFileSync } from 'fs';
import { join } from 'path';
import { ArchetypeId, UserMetrics } from '../types';
import { logger } from '../../utils/logging';

export interface ChallengeTemplate {
  id: string;
  archetype: ArchetypeId;
  metric: keyof UserMetrics;
  title: string;
  prompt: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

let cachedTemplates: ChallengeTemplate[] | null = null;

/**
 * Load templates from challengeTemplates.json
 * Caches templates in memory after first load
 */
export function loadTemplates(): ChallengeTemplate[] {
  if (cachedTemplates) {
    return cachedTemplates;
  }

  try {
    const templatesPath = join(process.cwd(), 'src', 'config', 'challengeTemplates.json');
    const templatesData = readFileSync(templatesPath, 'utf-8');
    const rawTemplates = JSON.parse(templatesData);
    
    // Convert raw template format to ChallengeTemplate[]
    const templates: ChallengeTemplate[] = [];
    
    for (const [archetype, archetypeTemplates] of Object.entries(rawTemplates)) {
      if (Array.isArray(archetypeTemplates)) {
        for (const template of archetypeTemplates) {
          templates.push({
            id: template.id || `${archetype}-${Date.now()}`,
            archetype: archetype as ArchetypeId,
            metric: template.metric || 'technical',
            title: template.title || `${archetype} Challenge`,
            prompt: template.description || template.prompt || `Complete the ${archetype} challenge`,
            difficulty: template.difficulty || 'medium',
          });
        }
      }
    }
    
    cachedTemplates = templates;
    logger.info(`Loaded ${templates.length} challenge templates`);
    return templates;
  } catch (error: any) {
    logger.error('Error loading challenge templates:', error);
    cachedTemplates = [];
    return [];
  }
}

/**
 * Pick a template matching the given criteria
 * Returns null if no matching template found
 */
export function pickTemplate(
  archetype: ArchetypeId,
  metric: keyof UserMetrics,
  difficulty: 'easy' | 'medium' | 'hard'
): ChallengeTemplate | null {
  const templates = loadTemplates();
  
  // Filter by archetype, metric, and difficulty
  const matching = templates.filter(
    t => t.archetype === archetype && 
         t.metric === metric && 
         t.difficulty === difficulty
  );
  
  if (matching.length === 0) {
    // Try without difficulty constraint
    const withoutDifficulty = templates.filter(
      t => t.archetype === archetype && t.metric === metric
    );
    
    if (withoutDifficulty.length > 0) {
      // Return random one without difficulty match
      return withoutDifficulty[Math.floor(Math.random() * withoutDifficulty.length)];
    }
    
    return null;
  }
  
  // Return random matching template
  return matching[Math.floor(Math.random() * matching.length)];
}
