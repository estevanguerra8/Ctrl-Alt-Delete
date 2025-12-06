import { Router, Request, Response } from 'express';
import { computeLeaderboard } from '../core/leaderboardService';
import { logger } from '../utils/logging';

export const leaderboardRoutes = Router();

leaderboardRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const { metric } = req.query;
    
    const leaderboard = computeLeaderboard(metric as string | undefined);
    
    res.json(leaderboard);
  } catch (error) {
    logger.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

