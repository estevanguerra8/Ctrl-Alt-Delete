import axios from 'axios';
import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logging';

const LLM_CONFIG = JSON.parse(
  readFileSync(join(__dirname, '../config/llmConfig.json'), 'utf-8')
);

const API_KEY = process.env.LLM_API_KEY || '';
const BASE_URL = process.env.LLM_BASE_URL || LLM_CONFIG.baseURL;
const MODEL = process.env.LLM_MODEL || LLM_CONFIG.model;

export async function generateText(prompt: string, context?: Record<string, any>): Promise<string> {
  if (!API_KEY) {
    logger.warn('LLM_API_KEY not configured, using mock response');
    return mockLLMResponse(prompt);
  }
  
  try {
    const response = await axios.post(
      `${BASE_URL}/chat/completions`,
      {
        model: MODEL,
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: prompt },
        ],
        temperature: LLM_CONFIG.temperature,
        max_tokens: LLM_CONFIG.maxTokens,
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    return response.data.choices[0]?.message?.content || '';
  } catch (error: any) {
    logger.error('LLM API error, using mock:', error.message);
    return mockLLMResponse(prompt);
  }
}

function mockLLMResponse(prompt: string): string {
  // Simple mock for development
  if (prompt.includes('challenge')) {
    return 'Implement a function that reverses a linked list.';
  }
  if (prompt.includes('grade')) {
    return '85';
  }
  return 'Mock response';
}

