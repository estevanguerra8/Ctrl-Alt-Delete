import { Router, Request, Response } from 'express';
import { logger } from '../utils/logging';

export const webhookRoutes = Router();

// Stub for future webhooks (e.g., external scoring)
webhookRoutes.post('/', (req: Request, res: Response) => {
  logger.info('Webhook received:', req.body);
  res.json({ received: true });
});

