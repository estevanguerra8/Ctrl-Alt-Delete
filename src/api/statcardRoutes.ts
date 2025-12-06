import { Router, Request, Response } from 'express';
import { buildStatCardDTO } from '../core/statcardModel';
import { getOrCreateUserState } from '../core/userStore';
import { logger } from '../utils/logging';

export const statcardRoutes = Router();

/**
 * GET /api/statcard/:userId
 * Load user via userStore.getOrCreateUser
 * Build StatCardDTO via statcardModel.buildStatCardDTO
 * Return JSON
 */
statcardRoutes.get('/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    // Get or create user state
    getOrCreateUserState(userId);
    
    // Build StatCardDTO
    const statCard = buildStatCardDTO(userId);
    
    if (!statCard) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(statCard);
  } catch (error: any) {
    logger.error('Error fetching stat card:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
