import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../../utils/logging';

// Use process.cwd() for runtime path resolution
const CONFIG_DIR = join(process.cwd(), 'src/config');
const TEMPLATES_FILE = join(CONFIG_DIR, 'challengeTemplates.json');

let cachedTemplates: any = null;

export async function loadTemplates(): Promise<any> {
  if (cachedTemplates) {
    return cachedTemplates;
  }
  
  try {
    const data = readFileSync(TEMPLATES_FILE, 'utf-8');
    cachedTemplates = JSON.parse(data);
    return cachedTemplates;
  } catch (error) {
    logger.error('Error loading challenge templates:', error);
    return {};
  }
}

