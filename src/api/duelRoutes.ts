import { Router, Request, Response } from 'express';
import { getDuel, submitDuelAnswer } from '../core/duelManager';
import { startChallengeForDuel } from '../core/challenge/engine';
import { logger } from '../utils/logging';

export const duelRoutes = Router();

/**
 * GET /duel/:id
 * Look up duel & associated challenge (or generate one)
 * Return JSON like { duel, challenge } for the frontend
 */
duelRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const duel = getDuel(id);
    
    if (!duel) {
      return res.status(404).json({ error: 'Duel not found' });
    }
    
    // Generate or get challenge for this duel
    let challenge;
    try {
      challenge = await startChallengeForDuel(duel);
    } catch (error) {
      logger.warn('Could not generate challenge, using placeholder');
      challenge = {
        id: `${duel.id}-challenge`,
        duelId: duel.id,
        archetype: duel.archetype,
        metric: duel.metric,
        title: `${duel.archetype} Challenge`,
        prompt: `Complete the ${duel.metric} challenge for ${duel.archetype}`,
        difficulty: 'medium',
        createdAt: duel.createdAt,
      };
    }
    
    res.json({ duel, challenge });
  } catch (error: any) {
    logger.error('Error fetching duel:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /duel/:id/submit
 * Parse submission (userId, answer)
 * Use Challenge Engine to grade
 * Update Duel and UserState
 * Return simple result JSON
 */
duelRoutes.post('/:id/submit', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, submission } = req.body;
    
    if (!userId || !submission) {
      return res.status(400).json({ error: 'userId and submission are required' });
    }
    
    const duel = await submitDuelAnswer(id, userId, submission);
    
    if (!duel) {
      return res.status(404).json({ error: 'Duel not found or invalid' });
    }
    
    res.json({ 
      success: true, 
      duel,
      score: duel.scores[userId],
      message: duel.status === 'finished' ? 'Duel completed!' : 'Submission received, waiting for opponent...'
    });
  } catch (error: any) {
    logger.error('Error submitting duel answer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
