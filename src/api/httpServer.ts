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
  
  // Serve static files (style.css, script.js) BEFORE routes
  // This ensures CSS/JS files are served even if routes match
  const publicDir = join(process.cwd(), 'public');
  app.use(express.static(publicDir));
  logger.info(`Serving static files from: ${publicDir}`);
  
  // Mount routes
  app.use('/api/statcard', statcardRoutes);
  app.use('/duel', duelRoutes);
  app.use('/webhook', webhookRoutes);
  
  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Root route - show helpful message
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Series StatCard Service</title>
          <style>
            body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
            h1 { color: #667eea; }
            code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
          </style>
        </head>
        <body>
          <h1>⚔️ Series StatCard Service</h1>
          <p>This service handles Series chat commands and duel challenges.</p>
          <h2>How to use:</h2>
          <ol>
            <li>Send <code>!duel @user</code> in your Series chat</li>
            <li>You'll receive a link like: <code>http://localhost:3000/duel/:id</code></li>
            <li>Open that link to see your challenge</li>
          </ol>
          <p><strong>Note:</strong> You need a duel ID in the URL to view a challenge.</p>
          <p>API endpoints:</p>
          <ul>
            <li><code>GET /health</code> - Health check</li>
            <li><code>GET /duel/:id</code> - Get duel challenge</li>
            <li><code>POST /duel/:id/submit</code> - Submit answer</li>
          </ul>
        </body>
      </html>
    `);
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
