import configData from './config.json';
import { logger } from '../utils/logging';

export interface ArchetypeConfig {
  name: string;
  weight: number;
  enabled: boolean;
}

export interface TierConfig {
  min: number;
  max: number | null;
  name: string;
}

export interface EloConfig {
  initialRating: number;
  kFactor: number;
  minRating: number;
  maxRating: number;
}

export interface DomainConfig {
  archetypes: Record<string, ArchetypeConfig>;
  tiers: Record<string, TierConfig>;
  elo: EloConfig;
  demo: {
    enabled: boolean;
    seedUsers: string[];
  };
}

let config: DomainConfig | null = null;

export function loadConfig(): DomainConfig {
  if (!config) {
    config = configData as DomainConfig;
    logger.info('Domain config loaded');
  }
  return config;
}

export function getConfig(): DomainConfig {
  return loadConfig();
}

export function getArchetypeConfig(archetype: string): ArchetypeConfig | null {
  const cfg = getConfig();
  return cfg.archetypes[archetype] || null;
}

export function getTierForRating(rating: number): string {
  const cfg = getConfig();
  const tiers = Object.entries(cfg.tiers).sort((a, b) => b[1].min - a[1].min);
  
  for (const [tierName, tierConfig] of tiers) {
    if (rating >= tierConfig.min && (tierConfig.max === null || rating < tierConfig.max)) {
      return tierName;
    }
  }
  return 'bronze';
}

export function getEnabledArchetypes(): string[] {
  const cfg = getConfig();
  return Object.entries(cfg.archetypes)
    .filter(([_, arch]) => arch.enabled)
    .map(([name]) => name);
}

