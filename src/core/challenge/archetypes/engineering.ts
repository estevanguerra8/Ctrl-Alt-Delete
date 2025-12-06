import { ArchetypeId, UserMetrics, Challenge } from '../../types';
import { ChallengeTemplate } from '../templates';
import { generateId } from '../../../utils/validation';

/**
 * Engineering Archetype Implementation
 * Real implementation for engineering challenges
 */

/**
 * Build an Engineering challenge from a template
 */
export function buildEngineeringChallengeFromTemplate(
  duelId: string,
  template: ChallengeTemplate
): Challenge {
  return {
    id: generateId(),
    duelId,
    archetype: 'engineering',
    metric: template.metric,
    title: template.title,
    prompt: template.prompt,
    difficulty: template.difficulty,
    createdAt: Date.now(),
  };
}

/**
 * Build a fallback Engineering challenge when no template is available
 */
export function buildFallbackEngineeringChallenge(
  duelId: string,
  metric: keyof UserMetrics
): Challenge {
  const challenges: Record<keyof UserMetrics, { title: string; prompt: string }> = {
    technical: {
      title: 'Algorithm Optimization Challenge',
      prompt: `Design and implement an efficient algorithm to solve the following problem:

Given an array of integers, find the maximum sum of a contiguous subarray.

Requirements:
- Provide time and space complexity analysis
- Handle edge cases (empty array, all negative numbers, etc.)
- Include test cases with your solution

Submit your solution with code, explanation, and complexity analysis.`,
    },
    strategy: {
      title: 'System Design Challenge',
      prompt: `Design a scalable caching system with the following requirements:

- Support LRU (Least Recently Used) eviction policy
- Handle concurrent read/write operations
- Provide O(1) time complexity for get and put operations
- Support distributed deployment

Submit your design with:
- Architecture diagram (text description is fine)
- Data structures and algorithms used
- Trade-offs and alternatives considered`,
    },
    execution: {
      title: 'Code Review and Refactoring',
      prompt: `Review and refactor the following code snippet:

\`\`\`javascript
function processData(data) {
  let result = [];
  for (let i = 0; i < data.length; i++) {
    if (data[i].status === 'active') {
      result.push(data[i].value * 2);
    }
  }
  return result;
}
\`\`\`

Tasks:
1. Identify potential issues and improvements
2. Refactor the code for better readability and performance
3. Add error handling
4. Write unit tests

Submit your refactored code with explanations.`,
    },
    aura: {
      title: 'Technical Communication Challenge',
      prompt: `Explain a complex technical concept (e.g., "How does a database index work?") to a non-technical audience.

Requirements:
- Use simple language and analogies
- Include a visual diagram (text description is fine)
- Cover the key benefits and trade-offs
- Keep it under 300 words

Submit your explanation.`,
    },
    experience: {
      title: 'Troubleshooting Challenge',
      prompt: `A production system is experiencing intermittent slowdowns. Describe your troubleshooting approach:

Given symptoms:
- Response times spike randomly (2-10 seconds)
- CPU usage is normal
- Memory usage is stable
- Network latency is low

Provide:
1. Your diagnostic steps
2. Tools and metrics you'd check
3. Potential root causes
4. Solutions for each cause

Submit your troubleshooting plan.`,
    },
  };

  const challenge = challenges[metric] || challenges.technical;

  return {
    id: generateId(),
    duelId,
    archetype: 'engineering',
    metric,
    title: challenge.title,
    prompt: challenge.prompt,
    difficulty: 'medium',
    createdAt: Date.now(),
  };
}

/**
 * Check if a metric is valid for engineering challenges
 */
export function isEngineeringMetric(metric: keyof UserMetrics): boolean {
  // All metrics can be used in engineering challenges
  return true;
}
