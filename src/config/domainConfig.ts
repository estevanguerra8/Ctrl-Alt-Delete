import { readFileSync } from 'fs';
import { join } from 'path';

export interface Config {
  archetypes: string[];
  metrics: Record<string, any>;
  tiers: Record<string, { minRating: number; maxRating: number | null }>;
  elo: {
    initialRating: number;
    kFactor: number;
    blendWeights: Record<string, number>;
  };
  demo: {
    enabled: boolean;
    seedUsers: string[];
  };
}

let cachedConfig: Config | null = null;

export function getConfig(): Config {
  if (cachedConfig) {
    return cachedConfig;
  }

  // Use process.cwd() to find config files in source directory
  const configPath = join(process.cwd(), 'src', 'config', 'config.json');
  const configData = readFileSync(configPath, 'utf-8');
  cachedConfig = JSON.parse(configData);
  return cachedConfig!;
}

export function reloadConfig(): Config {
  cachedConfig = null;
  return getConfig();
}

