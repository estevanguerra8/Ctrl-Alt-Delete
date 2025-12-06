import { readFileSync } from 'fs';
import { join } from 'path';
import { ArchetypeId } from '../types';

let cachedTemplates: Record<string, any[]> | null = null;

/**
 * Loads challengeTemplates.json
 * Exports helper to pick a template for a given archetype/metric/difficulty
 */
export function loadTemplates(): Record<string, any[]> {
  if (cachedTemplates) {
    return cachedTemplates;
  }
  
  // Use process.cwd() to find config files in source directory
  const templatesPath = join(process.cwd(), 'src', 'config', 'challengeTemplates.json');
  const templatesData = readFileSync(templatesPath, 'utf-8');
  cachedTemplates = JSON.parse(templatesData);
  return cachedTemplates!;
}

export function getTemplatesForArchetype(archetype: ArchetypeId): any[] {
  const templates = loadTemplates();
  return templates[archetype] || [];
}

export function getTemplateById(archetype: ArchetypeId, templateId: string): any | null {
  const templates = getTemplatesForArchetype(archetype);
  return templates.find(t => t.id === templateId) || null;
}
