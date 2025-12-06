import { Router, Request, Response } from 'express';
import { buildStatCardDTO } from '../core/statcardModel';
import { logger } from '../utils/logging';

export const statcardRoutes = Router();

statcardRoutes.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    const statCard = buildStatCardDTO(userId);
    
    if (!statCard) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(statCard);
  } catch (error) {
    logger.error('Error fetching statcard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

