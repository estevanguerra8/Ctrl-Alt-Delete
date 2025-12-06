export type ArchetypeId =
  | "engineering"
  | "finance"
  | "creative"
  | "business_ops"
  | "product"
  | "research";

export interface UserMetrics {
  technical: number;
  strategy: number;
  execution: number;
  aura: number;
  experience: number;
}

export interface UserRanks {
  overall?: number;
  technical?: number;
  strategy?: number;
  execution?: number;
  aura?: number;
}

export interface UserState {
  userId: string;
  archetype: ArchetypeId;
  metrics: UserMetrics;
  duelElo: number;
  finalElo: number;
  tier: string;          // Bronze / Silver / Gold / Diamond / Mythic
  overallScore: number;  // 0–99
  streakDays: number;
  lastActiveAt: number;
  ranks: UserRanks;
}

export type DuelStatus = "pending" | "active" | "finished";

export interface Duel {
  id: string;
  archetype: ArchetypeId;
  metric: keyof UserMetrics;
  challengerId: string;
  opponentId: string;
  createdAt: number;
  startTime?: number;
  endTime?: number;
  durationMinutes: number;
  status: DuelStatus;
  scores: Record<string, number>;
}

export interface StatCardMetric {
  key: keyof UserMetrics;
  label: string;
  emoji: string;
  value: number;
}

export interface StatCardDTO {
  userId: string;
  archetypeId: ArchetypeId;
  archetypeName: string;
  primaryEmoji: string;
  overallScore: number;
  tier: string;
  finalElo: number;
  metrics: StatCardMetric[];
  badges: string[];
}

export interface Challenge {
  id: string;
  duelId: string;
  archetype: ArchetypeId;
  metric: keyof UserMetrics;
  title: string;
  prompt: string;
  difficulty: "easy" | "medium" | "hard";
  createdAt: number;
}

export interface Submission {
  id: string;
  duelId: string;
  userId: string;
  answer: string;
  submittedAt: number;
  score?: number;
}
