import { sendSeriesMessage } from '../messaging/seriesClient';
import { logger } from '../utils/logging';

export async function sendNotification(userId: string, title: string, body: string): Promise<void> {
  try {
    const message = `${title}\n\n${body}`;
    await sendSeriesMessage(userId, message);
  } catch (error) {
    logger.error('Error sending notification:', error);
    throw error;
  }
}

export async function notifyDuelChallenge(
  challengeeId: string,
  challengerId: string,
  duelId: string,
  baseUrl: string
): Promise<void> {
  const message = `⚔️ Duel Challenge!\n\nYou've been challenged by ${challengerId}.\n\nAccept: ${baseUrl}/duel/${duelId}`;
  await sendSeriesMessage(challengeeId, message);
}

export async function notifyDuelResult(
  userId: string,
  opponentId: string,
  won: boolean,
  archetype: string
): Promise<void> {
  const result = won ? 'won' : 'lost';
  const message = `🏆 Duel Result\n\nYou ${result} the ${archetype} duel against ${opponentId}!`;
  await sendSeriesMessage(userId, message);
}

