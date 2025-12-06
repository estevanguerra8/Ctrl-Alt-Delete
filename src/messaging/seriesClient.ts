import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logging';

/**
 * Series iMessage-style Messaging API Client
 * 
 * API Documentation: https://series-hackathon-service-202642739529.us-east1.run.app/docs
 * 
 * Configure base URL and API key via environment variables:
 * - SERIES_API_BASE_URL
 * - SERIES_API_KEY
 * - SERIES_SENDER_NUMBER (optional, for creating new chats)
 */
export class SeriesClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private apiKey: string;
  private senderNumber: string;

  constructor(baseUrl: string, apiKey: string, senderNumber: string = '') {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.senderNumber = senderNumber || process.env.SERIES_SENDER_NUMBER || '';
    
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Send a message to a conversation/chat
   * 
   * Endpoint: POST /api/chats/{chat_id}/chat_messages
   * Payload: { "message": { "text": "...", "attachments": [...] } }
   * 
   * @param conversationId The chat_id (integer) from the Kafka event
   * @param text The message text to send
   */
  async sendMessageToConversation(conversationId: string, text: string): Promise<any> {
    if (!this.apiKey) {
      logger.error('SERIES_API_KEY not configured! Cannot send message.');
      throw new Error('SERIES_API_KEY not configured');
    }

    // conversationId from Kafka is the chat_id (should be an integer or string representation)
    const chatId = conversationId;
    
    logger.info(`📤 Sending to chat ${chatId}: "${text.substring(0, 30)}..."`);
    
    try {
      // Use the correct endpoint and payload structure from API docs
      const response = await this.client.post(`/api/chats/${chatId}/chat_messages`, {
        message: {
          text: text,
        },
      });
      
      logger.info(`✅ Sent to chat ${chatId} (message ID: ${response.data?.data?.id || 'N/A'})`);
      return response.data || {};
    } catch (error: any) {
      const errorMsg = error.response?.data || error.message;
      logger.error(`❌ Failed to send to chat ${chatId}:`, errorMsg);
      if (error.response?.status === 401) {
        logger.error('⚠️ API key authentication failed! Check SERIES_API_KEY in .env');
      } else if (error.response?.status === 404) {
        logger.error('⚠️ Chat not found. You may need to create the chat first or use a different chat_id.');
      }
      throw error;
    }
  }

  /**
   * Send a direct message to a user by phone number
   * 
   * This will create a new chat if one doesn't exist, or send to an existing chat.
   * First tries to find/create a chat, then sends the message.
   * 
   * @param userId The recipient's phone number (E.164 format preferred)
   * @param text The message text to send
   */
  async sendDirectMessage(userId: string, text: string): Promise<any> {
    if (!this.apiKey) {
      logger.error('SERIES_API_KEY not configured! Cannot send message.');
      throw new Error('SERIES_API_KEY not configured');
    }
    if (!this.senderNumber) {
      logger.error('SERIES_SENDER_NUMBER not configured! Cannot create chat.');
      throw new Error('SERIES_SENDER_NUMBER not configured');
    }

    const recipientPhone = this.formatPhoneNumber(userId);
    logger.info(`📤 Sending direct message to ${recipientPhone}: "${text.substring(0, 30)}..."`);

    try {
      // First, try to create or get a chat with this phone number
      // POST /api/chats with phone_numbers
      const chatResponse = await this.client.post('/api/chats', {
        phone_numbers: [recipientPhone],
      });
      
      const chatId = chatResponse.data?.data?.id || chatResponse.data?.id;
      
      if (!chatId) {
        throw new Error('Failed to get chat_id from chat creation response');
      }
      
      // Now send the message to this chat
      return await this.sendMessageToConversation(String(chatId), text);
    } catch (error: any) {
      const errorMsg = error.response?.data || error.message;
      logger.error(`❌ Failed to send direct message to ${recipientPhone}:`, errorMsg);
      if (error.response?.status === 401) {
        logger.error('⚠️ API key authentication failed! Check SERIES_API_KEY in .env');
      }
      throw error;
    }
  }

  private formatPhoneNumber(userId: string): string {
    if (userId.startsWith('+')) {
      return userId;
    }
    
    if (/^\d+$/.test(userId)) {
      if (userId.length === 10) {
        return `+1${userId}`;
      } else if (userId.length === 11 && userId.startsWith('1')) {
        return `+${userId}`;
      }
    }
    
    return userId;
  }
}

// Export singleton instance factory
export function createSeriesClient(): SeriesClient {
  const baseUrl = process.env.SERIES_API_BASE_URL || '';
  const apiKey = process.env.SERIES_API_KEY || '';
  const senderNumber = process.env.SERIES_SENDER_NUMBER || '';
  
  if (!baseUrl || !apiKey) {
    logger.warn('SERIES_API_BASE_URL or SERIES_API_KEY not configured');
    logger.warn('See iMessage Service API Docs.pdf for Series API configuration');
  }
  
  if (!senderNumber) {
    logger.warn('SERIES_SENDER_NUMBER not configured - direct messages may fail');
  }
  
  return new SeriesClient(baseUrl, apiKey, senderNumber);
}

// Legacy function export for backward compatibility
export async function sendSeriesMessage(userId: string, message: string): Promise<any> {
  const client = createSeriesClient();
  await client.sendDirectMessage(userId, message);
  return {};
}
