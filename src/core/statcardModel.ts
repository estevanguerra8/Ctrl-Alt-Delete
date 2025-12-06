import { StatCardDTO, UserState, StatCardMetric, ArchetypeId } from './types';
import { getUserState } from './userStore';

const ARCHETYPE_NAMES: Record<ArchetypeId, string> = {
  engineering: 'Engineering',
  finance: 'Finance',
  creative: 'Creative',
  business_ops: 'Business Ops',
  product: 'Product',
  research: 'Research',
};

const ARCHETYPE_EMOJIS: Record<ArchetypeId, string> = {
  engineering: '⚙️',
  finance: '💰',
  creative: '🎨',
  business_ops: '📊',
  product: '🚀',
  research: '🔬',
};

const METRIC_LABELS: Record<keyof import('./types').UserMetrics, { label: string; emoji: string }> = {
  technical: { label: 'Technical', emoji: '💻' },
  strategy: { label: 'Strategy', emoji: '🧠' },
  execution: { label: 'Execution', emoji: '⚡' },
  aura: { label: 'Aura', emoji: '✨' },
  experience: { label: 'Experience', emoji: '🌟' },
};

export function buildStatCardDTO(userId: string): StatCardDTO | null {
  const user = getUserState(userId);
  if (!user) {
    return null;
  }
  
  const metrics: StatCardMetric[] = Object.entries(user.metrics).map(([key, value]) => ({
    key: key as keyof import('./types').UserMetrics,
    label: METRIC_LABELS[key as keyof import('./types').UserMetrics].label,
    emoji: METRIC_LABELS[key as keyof import('./types').UserMetrics].emoji,
    value: value,
  }));
  
  return {
    userId: user.userId,
    archetypeId: user.archetype,
    archetypeName: ARCHETYPE_NAMES[user.archetype],
    primaryEmoji: ARCHETYPE_EMOJIS[user.archetype],
    overallScore: user.overallScore,
    tier: user.tier,
    finalElo: user.finalElo,
    metrics,
    badges: [], // TODO: Implement badge system
  };
}
