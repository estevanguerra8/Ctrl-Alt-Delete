import axios from 'axios';
import { logger } from '../utils/logging';

const API_BASE_URL = process.env.SERIES_API_BASE_URL || 'https://api.series.so';
const API_KEY = process.env.SERIES_API_KEY || '';
const SENDER_NUMBER = process.env.SERIES_SENDER_NUMBER || '+16463458837';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
});

/**
 * Convert userId to E.164 phone format
 * If userId is already in E.164 format, return as-is
 * Otherwise, try to format it
 */
function formatPhoneNumber(userId: string): string {
  // If already starts with +, assume it's E.164
  if (userId.startsWith('+')) {
    return userId;
  }
  
  // If it's all digits, assume US number and add +1
  if (/^\d+$/.test(userId)) {
    if (userId.length === 10) {
      return `+1${userId}`;
    } else if (userId.length === 11 && userId.startsWith('1')) {
      return `+${userId}`;
    }
  }
  
  // Return as-is if we can't format it
  return userId;
}

export async function sendSeriesMessage(userId: string, message: string): Promise<void> {
  try {
    if (!API_KEY) {
      logger.warn('SERIES_API_KEY not configured, message not sent');
      return;
    }
    
    const recipientPhone = formatPhoneNumber(userId);
    
    // Use Series API: POST /api/chats
    // This creates a chat (if needed) and sends the initial message
    const response = await client.post('/api/chats', {
      send_from: SENDER_NUMBER,
      chat: {
        phone_numbers: [recipientPhone],
      },
      message: {
        text: message,
      },
    });
    
    logger.info(`Message sent to ${recipientPhone} via chat ${response.data.id || 'unknown'}`);
  } catch (error: any) {
    logger.error('Error sending Series message:', error.response?.data || error.message);
    throw error;
  }
}

export async function sendSeriesNotification(
  userId: string,
  title: string,
  body: string
): Promise<void> {
  try {
    // TODO: Implement notification API if different from messages
    await sendSeriesMessage(userId, `${title}: ${body}`);
  } catch (error) {
    logger.error('Error sending Series notification:', error);
    throw error;
  }
}

