import { readFileSync } from 'fs';
import { join } from 'path';
import { ArchetypeId, UserMetrics } from './types';
import { logger } from '../utils/logging';
import axios from 'axios';

// Load LLM config
const LLM_CONFIG_PATH = join(process.cwd(), 'src', 'config', 'llmConfig.json');
let llmConfig: any = null;

function loadLLMConfig(): any {
  if (llmConfig) return llmConfig;
  try {
    const configData = readFileSync(LLM_CONFIG_PATH, 'utf-8');
    llmConfig = JSON.parse(configData);
    return llmConfig;
  } catch (error) {
    logger.warn('Could not load llmConfig.json, using defaults');
    return {
      model: 'gpt-4',
      baseURL: 'https://api.openai.com/v1',
      temperature: 0.7,
      maxTokens: 1000,
      prompts: {
        challengeGeneration: 'Generate a challenging problem for a {archetype} professional. Difficulty: {difficulty}',
        grading: 'Grade this submission for a {archetype} challenge. Score 0-100 based on: {criteria}',
      },
    };
  }
}

export interface GradingFeedback {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

export interface LLMClient {
  generateChallengePrompt(input: {
    archetype: ArchetypeId;
    metric: keyof UserMetrics;
    difficulty: 'easy' | 'medium' | 'hard';
    baseTemplate?: string;
  }): Promise<string>;

  gradeSubmission(input: {
    archetype: ArchetypeId;
    metric: keyof UserMetrics;
    challengePrompt: string;
    answer: string;
  }): Promise<GradingFeedback>;
}

class LLMClientImpl implements LLMClient {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.LLM_API_KEY || '';
    if (!this.apiKey) {
      logger.warn('LLM_API_KEY not configured - using mock responses');
    }
  }

  async generateChallengePrompt(input: {
    archetype: ArchetypeId;
    metric: keyof UserMetrics;
    difficulty: 'easy' | 'medium' | 'hard';
    baseTemplate?: string;
  }): Promise<string> {
    // TODO: Replace with actual LLM API call
    // For now, use deterministic string operations
    
    const config = loadLLMConfig();
    const promptTemplate = config.prompts?.challengeGeneration || 
      'Generate a challenging problem for a {archetype} professional. Difficulty: {difficulty}';
    
    let prompt = promptTemplate
      .replace('{archetype}', input.archetype)
      .replace('{difficulty}', input.difficulty);
    
    if (input.baseTemplate) {
      prompt = `${input.baseTemplate}\n\n${prompt}`;
    }
    
    // Mock response - in production, call actual LLM API here
    // const response = await axios.post(`${config.baseURL}/chat/completions`, {
    //   model: config.model,
    //   messages: [{ role: 'user', content: prompt }],
    //   temperature: config.temperature,
    //   max_tokens: config.maxTokens,
    // });
    // return response.data.choices[0].message.content;
    
    // For now, return a deterministic mock based on inputs
    return `Create a ${input.difficulty} ${input.metric} challenge for ${input.archetype} professionals. 
Focus on practical skills and real-world application. Provide clear instructions and expected outcomes.`;
  }

  async gradeSubmission(input: {
    archetype: ArchetypeId;
    metric: keyof UserMetrics;
    challengePrompt: string;
    answer: string;
  }): Promise<GradingFeedback> {
    const config = loadLLMConfig();
    
    if (!this.apiKey) {
      logger.warn('LLM_API_KEY not configured - using fallback grading');
      return this.fallbackGrading(input);
    }
    
    try {
      // Create a comprehensive grading prompt
      const systemPrompt = `You are an expert grader for ${input.archetype} challenges. 
Analyze the submission carefully and provide:
1. A score from 0-100 based on correctness, completeness, quality, and relevance
2. Detailed feedback explaining the score
3. Specific strengths (what was done well)
4. Specific areas for improvement (what needs work)

Be honest and critical. Low-quality or irrelevant submissions should receive low scores.
Random strings or nonsense should receive scores below 20.

Return your response as a JSON object with this exact format:
{
  "score": <number 0-100>,
  "feedback": "<detailed explanation>",
  "strengths": ["<strength1>", "<strength2>", ...],
  "improvements": ["<improvement1>", "<improvement2>", ...]
}`;

      const userPrompt = `Challenge (${input.archetype} - ${input.metric}):
${input.challengePrompt}

Submission:
${input.answer}

Analyze this submission and provide your grading in the JSON format specified.`;

      logger.info(`[LLM] Calling LLM API for grading (${input.archetype}/${input.metric})`);
      
      const response = await axios.post(
        `${config.baseURL}/chat/completions`,
        {
          model: config.model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3, // Lower temperature for consistent grading
          max_tokens: 1000,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 second timeout
        }
      );

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in LLM response');
      }

      logger.info(`[LLM] Received response from LLM`);
      
      // Parse JSON response - extract JSON from text if needed
      let gradingResult: any;
      try {
        // Try to parse as-is (might be pure JSON)
        gradingResult = JSON.parse(content);
      } catch (parseError) {
        // If that fails, try to extract JSON from markdown code blocks or text
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          gradingResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Could not parse JSON from LLM response');
        }
      }
      
      // Validate and clamp score
      const score = Math.max(0, Math.min(100, Math.round(gradingResult.score || 0)));
      
      return {
        score,
        feedback: gradingResult.feedback || `Your submission scored ${score}/100.`,
        strengths: Array.isArray(gradingResult.strengths) ? gradingResult.strengths : [],
        improvements: Array.isArray(gradingResult.improvements) ? gradingResult.improvements : [],
      };
    } catch (error: any) {
      logger.error('[LLM] Error calling LLM API:', error.response?.data || error.message);
      logger.warn('[LLM] Falling back to heuristic grading');
      return this.fallbackGrading(input);
    }
  }

  /**
   * Fallback grading when LLM is not available
   * This should be very strict - random strings should get low scores
   */
  private fallbackGrading(input: {
    archetype: ArchetypeId;
    metric: keyof UserMetrics;
    challengePrompt: string;
    answer: string;
  }): GradingFeedback {
    const answer = input.answer.trim();
    
    // Very strict: random strings or nonsense should get very low scores
    if (!answer || answer.length < 10) {
      return {
        score: 0,
        feedback: 'Your submission is too short or empty. Please provide a complete answer to the challenge.',
        strengths: [],
        improvements: ['Provide a complete, detailed answer addressing all requirements'],
      };
    }
    
    // Check if answer is just random characters (no words, no structure)
    const wordCount = answer.split(/\s+/).filter(w => w.length > 2).length;
    const hasCodeStructure = /(def|function|class|if|for|while|return|const|let|var)\s*/.test(answer);
    const hasReasonableLength = answer.length > 50;
    
    // If it's clearly nonsense (very few words, no structure), give low score
    if (wordCount < 5 && !hasCodeStructure) {
      return {
        score: Math.max(0, Math.min(20, wordCount * 4)),
        feedback: 'Your submission appears to be incomplete or does not address the challenge requirements. Please provide a detailed solution.',
        strengths: [],
        improvements: [
          'Provide a complete solution addressing all challenge requirements',
          'Include code implementation if applicable',
          'Explain your approach and reasoning',
        ],
      };
    }
    
    // Basic heuristic scoring (still strict)
    let score = 30; // Start low
    
    // Check relevance to challenge
    const challengeWords = input.challengePrompt.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const answerLower = answer.toLowerCase();
    const relevantWords = challengeWords.filter(w => answerLower.includes(w)).length;
    score += Math.min(30, (relevantWords / challengeWords.length) * 30);
    
    // Length and structure bonus
    if (hasCodeStructure) score += 15;
    if (hasReasonableLength) score += 10;
    if (wordCount > 20) score += 15;
    
    const finalScore = Math.max(0, Math.min(100, Math.round(score)));
    
    const strengths: string[] = [];
    const improvements: string[] = [];
    
    if (hasCodeStructure) {
      strengths.push('Included code implementation');
    } else {
      improvements.push('Include code implementation');
    }
    
    if (answer.length > 200) {
      strengths.push('Provided detailed explanation');
    } else {
      improvements.push('Provide more detail and explanation');
    }
    
    if (relevantWords / challengeWords.length > 0.3) {
      strengths.push('Addresses challenge requirements');
    } else {
      improvements.push('Better address the specific challenge requirements');
    }
    
    return {
      score: finalScore,
      feedback: `Your submission scored ${finalScore}/100. ${finalScore < 50 ? 'Please review the challenge requirements and provide a more complete solution.' : 'Consider the improvements below to enhance your solution.'}`,
      strengths,
      improvements,
    };
  }
}

export function createLLMClient(): LLMClient {
  return new LLMClientImpl();
}
