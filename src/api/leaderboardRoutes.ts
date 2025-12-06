import { Router, Request, Response } from 'express';
import { getLeaderboard } from '../core/leaderboardService';
import { logger } from '../utils/logging';

export const leaderboardRoutes = Router();

leaderboardRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const { archetype } = req.query;
    
    const leaderboard = getLeaderboard(archetype as string | undefined);
    
    res.json(leaderboard);
  } catch (error) {
    logger.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

