import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { UserState, Archetype } from './types';
import { getConfig } from '../config/domainConfig';
import { logger } from '../utils/logging';

const DATA_DIR = process.env.DATA_DIR || './data';
const USERS_FILE = join(DATA_DIR, 'users.json');

const userStore = new Map<string, UserState>();

export function getUserState(userId: string): UserState | null {
  return userStore.get(userId) || null;
}

export function getOrCreateUserState(userId: string): UserState {
  let user = userStore.get(userId);
  if (!user) {
    const config = getConfig();
    const now = new Date().toISOString();
    const initialRating = config.elo.initialRating;
    
    const stats: Record<Archetype, any> = {} as any;
    const archetypes: Archetype[] = ['engineering', 'finance', 'creative', 'business_ops', 'product', 'research'];
    
    for (const arch of archetypes) {
      stats[arch] = {
        archetype: arch,
        rating: initialRating,
        wins: 0,
        losses: 0,
        draws: 0,
        lastUpdated: now,
      };
    }

    user = {
      userId,
      stats,
      blendedRating: initialRating,
      tier: 'bronze',
      rank: 0,
      totalDuels: 0,
      createdAt: now,
      updatedAt: now,
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
    updatedAt: new Date().toISOString(),
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
      if (existsSync(USERS_FILE)) {
        const data = readFileSync(USERS_FILE, 'utf-8');
        const users: UserState[] = JSON.parse(data);
        userStore.clear();
        for (const user of users) {
          userStore.set(user.userId, user);
        }
        logger.info(`Loaded ${users.length} users from ${USERS_FILE}`);
      } else {
        logger.info(`No existing user data found at ${USERS_FILE}`);
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

