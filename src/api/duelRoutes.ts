import { Router, Request, Response } from 'express';
import { getDuel, submitDuelSolution } from '../core/duelManager';
import { logger } from '../utils/logging';

export const duelRoutes = Router();

duelRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const duel = getDuel(id);
    
    if (!duel) {
      return res.status(404).json({ error: 'Duel not found' });
    }
    
    // Return duel data for the frontend
    res.json({
      id: duel.id,
      challenge: duel.challenge,
      status: duel.status,
      expiresAt: duel.expiresAt,
    });
  } catch (error) {
    logger.error('Error fetching duel:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

duelRoutes.post('/:id/submit', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, solution } = req.body;
    
    if (!userId || !solution) {
      return res.status(400).json({ error: 'userId and solution are required' });
    }
    
    const duel = await submitDuelSolution(id, userId, solution);
    
    res.json({
      success: true,
      duel: {
        id: duel.id,
        status: duel.status,
        winnerId: duel.winnerId,
        challengerSubmission: duel.challengerSubmission,
        defenderSubmission: duel.defenderSubmission,
      },
    });
  } catch (error: any) {
    logger.error('Error submitting duel solution:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

