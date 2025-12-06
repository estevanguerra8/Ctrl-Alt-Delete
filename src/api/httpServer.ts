import express, { Express } from 'express';
import { join } from 'path';
import { statcardRoutes } from './statcardRoutes';
import { duelRoutes } from './duelRoutes';
import { webhookRoutes } from './webhookRoutes';
import { logger } from '../utils/logging';

export async function startHttpServer(port: number): Promise<void> {
  const app: Express = express();
  
  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Static files
  const publicDir = join(__dirname, '../../public');
  app.use(express.static(publicDir));
  
  // API routes
  app.use('/api/statcard', statcardRoutes);
  app.use('/duel', duelRoutes);
  app.use('/webhook', webhookRoutes);
  
  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      logger.info(`HTTP server listening on port ${port}`);
      resolve();
    });
    
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${port} is already in use. Please kill the process using this port or change the PORT in .env`);
        logger.info(`To find and kill the process: lsof -ti:${port} | xargs kill -9`);
      }
      reject(error);
    });
  });
}

