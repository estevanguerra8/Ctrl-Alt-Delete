"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const DATA_DIR = process.env.DATA_DIR || './data';
const CHALLENGES_DIR = (0, path_1.join)(DATA_DIR, 'challenges');
const TEMPLATES_FILE = (0, path_1.join)(__dirname, '../src/config/challengeTemplates.json');
async function seedChallenges() {
    console.log('Seeding challenges from templates...');
    if (!(0, fs_1.existsSync)(TEMPLATES_FILE)) {
        console.error('Templates file not found:', TEMPLATES_FILE);
        process.exit(1);
    }
    const templates = JSON.parse((0, fs_1.readFileSync)(TEMPLATES_FILE, 'utf-8'));
    for (const [archetype, archetypeTemplates] of Object.entries(templates)) {
        if (!Array.isArray(archetypeTemplates) || archetypeTemplates.length === 0) {
            continue;
        }
        const archetypeDir = (0, path_1.join)(CHALLENGES_DIR, archetype);
        if (!(0, fs_1.existsSync)(archetypeDir)) {
            (0, fs_1.mkdirSync)(archetypeDir, { recursive: true });
        }
        for (const template of archetypeTemplates) {
            const challengeFile = (0, path_1.join)(archetypeDir, `${template.id}.json`);
            (0, fs_1.writeFileSync)(challengeFile, JSON.stringify(template, null, 2), 'utf-8');
            console.log(`Created challenge: ${archetype}/${template.id}`);
        }
    }
    console.log('Challenges seeded successfully!');
}
seedChallenges().catch(console.error);
//# sourceMappingURL=seedChallenges.js.map