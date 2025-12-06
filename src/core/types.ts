export type Archetype = 'engineering' | 'finance' | 'creative' | 'business_ops' | 'product' | 'research';

export interface StatSnapshot {
  archetype: Archetype;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  lastUpdated: string;
}

export interface UserState {
  userId: string;
  stats: Record<Archetype, StatSnapshot>;
  blendedRating: number;
  tier: string;
  rank: number;
  totalDuels: number;
  createdAt: string;
  updatedAt: string;
}

export interface Duel {
  id: string;
  challengerId: string;
  defenderId: string;
  archetype: Archetype;
  status: 'pending' | 'active' | 'completed' | 'expired';
  challengeId: string | null;
  challenge: Challenge | null;
  challengerSubmission: Submission | null;
  defenderSubmission: Submission | null;
  winnerId: string | null;
  createdAt: string;
  expiresAt: string;
  completedAt: string | null;
}

export interface Challenge {
  id: string;
  archetype: Archetype;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedDuration: number;
  testCases: TestCase[];
  starterCode?: string;
  hints?: string[];
  templateId?: string;
}

export interface TestCase {
  input: string;
  expectedOutput: string;
  hidden?: boolean;
}

export interface Submission {
  userId: string;
  solution: string;
  submittedAt: string;
  score: number | null;
  gradedAt: string | null;
}

export interface StatCardDTO {
  userId: string;
  tier: string;
  blendedRating: number;
  rank: number;
  stats: Record<Archetype, {
    rating: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
  }>;
  totalDuels: number;
  lastUpdated: string;
}

export interface LeaderboardEntry {
  userId: string;
  blendedRating: number;
  rank: number;
  tier: string;
  totalDuels: number;
}

