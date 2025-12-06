import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { UserState, ArchetypeId, UserMetrics } from './types';
import { getConfig } from '../config/domainConfig';
import { logger } from '../utils/logging';
import { now } from '../utils/time';

const DATA_DIR = process.env.DATA_DIR || './data';
const USERS_FILE = join(DATA_DIR, 'users.json');

const userStore = new Map<string, UserState>();

export function getUserState(userId: string): UserState | null {
  return userStore.get(userId) || null;
}

export function getOrCreateUserState(userId: string, archetype: ArchetypeId = 'engineering'): UserState {
  let user = userStore.get(userId);
  if (!user) {
    const config = getConfig();
    const initialRating = config.elo.initialRating;
    
    // Initialize UserMetrics with default values
    const metrics: UserMetrics = {
      technical: 50,
      strategy: 50,
      execution: 50,
      aura: 50,
      experience: 50,
    };

    user = {
      userId,
      archetype,
      metrics,
      duelElo: initialRating,
      finalElo: initialRating,
      tier: 'Bronze',
      overallScore: 50,
      streakDays: 0,
      lastActiveAt: Date.now(),
      ranks: {},
    };
    
    userStore.set(userId, user);
    saveUserStore();
  }
  return user;
}

export function updateUserState(userId: string, updates: Partial<UserState>): UserState {
  const user = getOrCreateUserState(userId);
  const updated = {
    ...user,
    ...updates,
  };
  userStore.set(userId, updated);
  saveUserStore();
  return updated;
}

export function getAllUsers(): UserState[] {
  return Array.from(userStore.values());
}

export function loadUserStore(): Promise<void> {
  return new Promise((resolve) => {
    try {
      if (!existsSync(DATA_DIR)) {
        mkdirSync(DATA_DIR, { recursive: true });
      }

      if (existsSync(USERS_FILE)) {
        const data = readFileSync(USERS_FILE, 'utf-8');
        const users: UserState[] = JSON.parse(data);
        userStore.clear();
        for (const user of users) {
          userStore.set(user.userId, user);
        }
        logger.info(`Loaded ${users.length} users from ${USERS_FILE}`);
      } else {
        writeFileSync(USERS_FILE, JSON.stringify([], null, 2), 'utf-8');
        logger.info(`Created new users file at ${USERS_FILE}`);
      }
    } catch (error) {
      logger.error('Error loading user store:', error);
    }
    resolve();
  });
}

export function saveUserStore(): void {
  try {
    const users = Array.from(userStore.values());
    writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (error) {
    logger.error('Error saving user store:', error);
  }
}
