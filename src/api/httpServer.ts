import express, { Express } from 'express';
import { join } from 'path';
import { statcardRoutes } from './statcardRoutes';
import { duelRoutes } from './duelRoutes';
import { webhookRoutes } from './webhookRoutes';
import { logger } from '../utils/logging';

/**
 * HTTP Server
 * Creates Express app, mounts routes/static
 * See: iMessage Service API Docs.pdf for API endpoints
 */
export function startHttpServer(port: number): void {
  const app: Express = express();
  
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Serve static files (duel.html, style.css, script.js)
  const publicDir = join(process.cwd(), 'public');
  app.use(express.static(publicDir));
  
  // Mount routes
  app.use('/api/statcard', statcardRoutes);
  app.use('/duel', duelRoutes);
  app.use('/webhook', webhookRoutes);
  
  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  const server = app.listen(port, () => {
    logger.info(`HTTP server listening on port ${port}`);
  });
  
  server.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`Port ${port} is already in use. Attempting to kill the process...`);
      try {
        const { execSync } = require('child_process');
        execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore' });
        logger.info(`Killed process on port ${port}. Please restart the service.`);
      } catch (e) {
        logger.error(`Failed to kill process. Please run manually: lsof -ti:${port} | xargs kill -9`);
      }
      process.exit(1);
    } else {
      logger.error('HTTP server error:', error);
      throw error;
    }
  });
}
