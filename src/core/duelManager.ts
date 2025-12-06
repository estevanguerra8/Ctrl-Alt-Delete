import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Duel, Challenge, Submission, ArchetypeId, UserMetrics, SubmissionFeedback } from './types';
import { generateId } from '../utils/validation';
import { logger } from '../utils/logging';
import { getOrCreateUserState, updateUserState } from './userStore';
import { updateMetric, updateUserStats } from './statEngine';
import { updateElo } from './eloEngine';
import { updateRanks } from './leaderboardService';
import * as challengeEngine from './challenge/engine';
import { createSeriesClient } from '../messaging/seriesClient';

const DATA_DIR = process.env.DATA_DIR || './data';
const DUELS_FILE = join(DATA_DIR, 'duels.json');

const duelStore = new Map<string, Duel>();

export function getDuel(duelId: string): Duel | null {
  return duelStore.get(duelId) || null;
}

export function createDuel(
  challengerId: string,
  opponentId: string,
  archetype: ArchetypeId,
  metric: keyof UserMetrics,
  durationMinutes: number
): Duel {
  const duel: Duel = {
    id: generateId(),
    archetype,
    metric,
    challengerId,
    opponentId,
    createdAt: Date.now(),
    durationMinutes,
    status: 'active', // Start as active so timer can begin immediately
    startTime: Date.now(), // Timer starts when duel is created
    scores: {},
    feedback: {},
    conversationIds: {}, // Will store conversationIds for messaging
  };
  
  // For demo: Add hardcoded challenger score/feedback (PERFECT SCORE)
  // This simulates the challenger having already submitted with a perfect response
  duel.feedback[challengerId] = {
    score: 100,
    feedback: 'Perfect implementation! This solution demonstrates exceptional understanding of Kadane\'s algorithm with flawless execution. The code is elegant, well-documented, handles all edge cases comprehensively, and includes thorough complexity analysis. The test cases are comprehensive and the solution is production-ready.',
    strengths: [
      'Perfect implementation of Kadane\'s algorithm',
      'Comprehensive edge case handling (empty array, all negative, single element)',
      'Crystal clear time complexity analysis (O(n)) with detailed explanation',
      'Accurate space complexity (O(1)) with optimization notes',
      'Exceptionally well-structured and readable code',
      'Comprehensive test cases covering all scenarios',
      'Production-ready code quality',
      'Excellent documentation and comments'
    ],
    improvements: [], // Perfect score = no improvements needed
    submittedAt: Date.now() - 60000, // Submitted 1 minute ago
  };
  duel.scores[challengerId] = 100;
  
  duelStore.set(duel.id, duel);
  saveDuels();
  
  return duel;
}

/**
 * Ensure a challenge exists for a duel
 * Generates challenge if it doesn't exist
 */
export async function ensureChallengeForDuel(duel: Duel): Promise<Challenge> {
  return challengeEngine.startChallengeForDuel(duel);
}

export function acceptDuel(duelId: string, opponentId: string): Duel | null {
  const duel = duelStore.get(duelId);
  if (!duel || duel.opponentId !== opponentId) {
    return null;
  }
  
  if (duel.status !== 'pending') {
    return null;
  }
  
  duel.status = 'active';
  duel.startTime = Date.now();
  duelStore.set(duelId, duel);
  saveDuels();
  
  return duel;
}

export async function submitDuelAnswer(duelId: string, userId: string, answer: string): Promise<Duel | null> {
  logger.info(`[SUBMIT] submitDuelAnswer called: duelId=${duelId}, userId=${userId}, answerLength=${answer.length}`);
  
  const duel = duelStore.get(duelId);
  if (!duel) {
    logger.error(`[SUBMIT] Duel ${duelId} not found`);
    return null;
  }
  
  logger.info(`[SUBMIT] Duel found: challenger=${duel.challengerId}, opponent=${duel.opponentId}, status=${duel.status}`);
  
  // Check if user has already submitted
  if (duel.scores[userId] !== undefined) {
    logger.info(`[SUBMIT] User ${userId} has already submitted (score: ${duel.scores[userId]})`);
    // Return the existing duel so they can see their results
    return duel;
  }
  
  // Timer stops when user submits - record submission time
  // Allow submissions for 'active' duels, or 'pending' duels (will auto-activate)
  if (duel.status !== 'active' && duel.status !== 'pending') {
    logger.warn(`[SUBMIT] Duel ${duelId} is not active (status: ${duel.status})`);
    return null;
  }
  
  // Auto-activate if pending
  if (duel.status === 'pending') {
    duel.status = 'active';
    if (!duel.startTime) {
      duel.startTime = Date.now();
    }
    logger.info(`[SUBMIT] Auto-activated duel ${duelId}`);
  }
  
  // Check if this user is the challenger or opponent
  const isChallenger = userId === duel.challengerId;
  const isOpponent = userId === duel.opponentId;
  
  if (!isChallenger && !isOpponent) {
    logger.error(`[SUBMIT] User ${userId} is not the challenger (${duel.challengerId}) or opponent (${duel.opponentId})`);
    return null;
  }
  
  logger.info(`[SUBMIT] User ${userId} is ${isChallenger ? 'challenger' : 'opponent'}`);
  
  // Record when this user submitted (timer stops for them)
  if (!duel.feedback) {
    duel.feedback = {};
  }
  
  // Create submission
  const submission: Submission = {
    id: generateId(),
    duelId,
    userId,
    answer,
    submittedAt: Date.now(),
  };
  
  // Calculate time elapsed when user submitted (timer stops)
  const timeElapsed = duel.startTime ? Math.floor((submission.submittedAt - duel.startTime) / 1000) : 0;
  
  // Grade the submission (now returns { score, feedback, strengths, improvements })
  const gradingResult = await challengeEngine.gradeSubmissionForDuel(duel, submission);
  submission.score = gradingResult.score;
  
  // Store score and feedback (including time elapsed)
  duel.scores[userId] = gradingResult.score;
  duel.feedback[userId] = {
    score: gradingResult.score,
    feedback: gradingResult.feedback,
    strengths: gradingResult.strengths,
    improvements: gradingResult.improvements,
    submittedAt: submission.submittedAt,
    timeElapsed: timeElapsed,
  };
  
  duelStore.set(duelId, duel);
  saveDuels();
  
  // Check if both have submitted
  const challengerScore = duel.scores[duel.challengerId];
  const opponentScore = duel.scores[duel.opponentId];
  
  logger.info(`[DUEL] Checking submissions: challenger=${challengerScore !== undefined ? challengerScore : 'none'}, opponent=${opponentScore !== undefined ? opponentScore : 'none'}`);
  
  if (challengerScore !== undefined && opponentScore !== undefined) {
    logger.info(`[DUEL] Both have submitted! Finalizing duel ${duel.id}...`);
    await finalizeDuel(duel);
    logger.info(`[DUEL] Duel ${duel.id} finalized`);
  } else {
    logger.info(`[DUEL] Waiting for both submissions. Challenger: ${challengerScore !== undefined ? 'submitted' : 'pending'}, Opponent: ${opponentScore !== undefined ? 'submitted' : 'pending'}`);
  }
  
  return duel;
}

/**
 * Store conversationId for a user in a duel (for sending messages)
 */
export function setDuelConversationId(duelId: string, userId: string, conversationId: string): void {
  const duel = duelStore.get(duelId);
  if (duel) {
    if (!duel.conversationIds) {
      duel.conversationIds = {};
    }
    duel.conversationIds[userId] = conversationId;
    saveDuels();
  }
}

async function finalizeDuel(duel: Duel): Promise<void> {
  const challengerScore = duel.scores[duel.challengerId] || 0;
  const opponentScore = duel.scores[duel.opponentId] || 0;
  
  duel.status = 'finished';
  duel.endTime = Date.now();
  
  // Send comparison message via Series API if conversationIds are available
  await sendComparisonMessage(duel);
  
  // Determine winner
  if (challengerScore > opponentScore) {
    // Challenger wins
    const challenger = getOrCreateUserState(duel.challengerId);
    const opponent = getOrCreateUserState(duel.opponentId);
    
    await updateElo(duel.challengerId, opponent.duelElo, 1);
    await updateElo(duel.opponentId, challenger.duelElo, 0);
    
    // Update metrics
    updateMetric(duel.challengerId, duel.metric, 5);
    updateMetric(duel.opponentId, duel.metric, -2);
  } else if (opponentScore > challengerScore) {
    // Opponent wins
    const challenger = getOrCreateUserState(duel.challengerId);
    const opponent = getOrCreateUserState(duel.opponentId);
    
    await updateElo(duel.challengerId, opponent.duelElo, 0);
    await updateElo(duel.opponentId, challenger.duelElo, 1);
    
    // Update metrics
    updateMetric(duel.challengerId, duel.metric, -2);
    updateMetric(duel.opponentId, duel.metric, 5);
  } else {
    // Draw
    const challenger = getOrCreateUserState(duel.challengerId);
    const opponent = getOrCreateUserState(duel.opponentId);
    
    await updateElo(duel.challengerId, opponent.duelElo, 0.5);
    await updateElo(duel.opponentId, challenger.duelElo, 0.5);
  }
  
  // Update stats and ranks
  updateUserStats(duel.challengerId);
  updateUserStats(duel.opponentId);
  updateRanks();
  
  duelStore.set(duel.id, duel);
  saveDuels();
}

/**
 * Send comparison message to both users via Series API
 */
async function sendComparisonMessage(duel: Duel): Promise<void> {
  if (!duel.conversationIds || Object.keys(duel.conversationIds).length === 0) {
    logger.warn(`No conversationIds stored for duel ${duel.id}, skipping comparison message`);
    return;
  }
  
  const challengerScore = duel.scores[duel.challengerId] || 0;
  const opponentScore = duel.scores[duel.opponentId] || 0;
  const challengerFeedback = duel.feedback?.[duel.challengerId];
  const opponentFeedback = duel.feedback?.[duel.opponentId];
  
  if (!challengerFeedback || !opponentFeedback) {
    logger.warn(`Missing feedback for duel ${duel.id}, skipping comparison message`);
    return;
  }
  
  // Determine winner
  let winner: string;
  if (challengerScore > opponentScore) {
    winner = duel.challengerId;
  } else if (opponentScore > challengerScore) {
    winner = duel.opponentId;
  } else {
    winner = 'draw';
  }
  
  // Build comparison message
  let message = `🏆 Duel Results\n\n`;
  message += `Challenger: ${challengerScore}/100\n`;
  message += `You: ${opponentScore}/100\n\n`;
  
  if (winner === 'draw') {
    message += `🤝 It's a Draw!\n\n`;
  } else if (winner === duel.opponentId) {
    message += `🎉 You Won!\n\n`;
  } else {
    message += `📊 Challenger Won\n\n`;
  }
  
  // Add perfect score badges
  if (challengerScore === 100) {
    message += `⭐ Challenger achieved PERFECT SCORE!\n`;
  }
  if (opponentScore === 100) {
    message += `⭐ You achieved PERFECT SCORE!\n`;
  }
  
  message += `\n💬 Connect & Discuss Your Approaches!\n\n`;
  message += `Great work on completing the challenge! Both solutions show unique approaches and insights. `;
  message += `Connect with your opponent to discuss different strategies, learn from each other's solutions, `;
  message += `and share insights about your problem-solving approaches.\n\n`;
  message += `Use !connect in Series chat to find similar players!`;
  
  // Send to opponent (the one who just submitted via web)
  const opponentConversationId = duel.conversationIds[duel.opponentId];
  if (opponentConversationId) {
    try {
      const client = createSeriesClient();
      await client.sendMessageToConversation(opponentConversationId, message);
      logger.info(`✅ Sent comparison message to opponent (conversation ${opponentConversationId})`);
    } catch (error: any) {
      logger.error(`❌ Failed to send comparison message to opponent:`, error);
    }
  } else {
    logger.warn(`No conversationId found for opponent ${duel.opponentId}`);
  }
  
  // Also send to challenger if they have a conversationId
  const challengerConversationId = duel.conversationIds[duel.challengerId];
  if (challengerConversationId) {
    try {
      const client = createSeriesClient();
      await client.sendMessageToConversation(challengerConversationId, message);
      logger.info(`✅ Sent comparison message to challenger (conversation ${challengerConversationId})`);
    } catch (error: any) {
      logger.error(`❌ Failed to send comparison message to challenger:`, error);
    }
  }
}

export function getUserDuels(userId: string): Duel[] {
  return Array.from(duelStore.values()).filter(
    d => d.challengerId === userId || d.opponentId === userId
  );
}

export function loadDuels(): Promise<void> {
  return new Promise((resolve) => {
    try {
      if (!existsSync(DATA_DIR)) {
        mkdirSync(DATA_DIR, { recursive: true });
      }

      if (existsSync(DUELS_FILE)) {
        const data = readFileSync(DUELS_FILE, 'utf-8');
        const duels: Duel[] = JSON.parse(data);
        duelStore.clear();
        for (const duel of duels) {
          duelStore.set(duel.id, duel);
        }
        logger.info(`Loaded ${duels.length} duels from ${DUELS_FILE}`);
      } else {
        writeFileSync(DUELS_FILE, JSON.stringify([], null, 2), 'utf-8');
        logger.info(`Created new duels file at ${DUELS_FILE}`);
      }
    } catch (error) {
      logger.error('Error loading duels:', error);
    }
    resolve();
  });
}

export function saveDuels(): void {
  try {
    const duels = Array.from(duelStore.values());
    writeFileSync(DUELS_FILE, JSON.stringify(duels, null, 2), 'utf-8');
  } catch (error) {
    logger.error('Error saving duels:', error);
  }
}
