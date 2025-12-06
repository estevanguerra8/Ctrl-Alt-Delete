import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Challenge } from '../src/core/types';

const DATA_DIR = process.env.DATA_DIR || './data';
const CHALLENGES_DIR = join(DATA_DIR, 'challenges');
const TEMPLATES_FILE = join(__dirname, '../src/config/challengeTemplates.json');

async function seedChallenges() {
  console.log('Seeding challenges from templates...');
  
  if (!existsSync(TEMPLATES_FILE)) {
    console.error('Templates file not found:', TEMPLATES_FILE);
    process.exit(1);
  }
  
  const templates = JSON.parse(readFileSync(TEMPLATES_FILE, 'utf-8'));
  
  for (const [archetype, archetypeTemplates] of Object.entries(templates)) {
    if (!Array.isArray(archetypeTemplates) || archetypeTemplates.length === 0) {
      continue;
    }
    
    const archetypeDir = join(CHALLENGES_DIR, archetype);
    if (!existsSync(archetypeDir)) {
      mkdirSync(archetypeDir, { recursive: true });
    }
    
    for (const template of archetypeTemplates) {
      const challengeFile = join(archetypeDir, `${template.id}.json`);
      writeFileSync(challengeFile, JSON.stringify(template, null, 2), 'utf-8');
      console.log(`Created challenge: ${archetype}/${template.id}`);
    }
  }
  
  console.log('Challenges seeded successfully!');
}

seedChallenges().catch(console.error);

