import express, { Express } from 'express';
import { join, resolve } from 'path';
import { statcardRoutes } from './statcardRoutes';
import { duelRoutes } from './duelRoutes';
import { webhookRoutes } from './webhookRoutes';
import { leaderboardRoutes } from './leaderboardRoutes';
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
  
  // Serve static files from public directory
  const publicDir = join(process.cwd(), 'public');
  app.use(express.static(publicDir));
  logger.info(`Serving static files from: ${publicDir}`);
  
  // Mount routes
  app.use('/api/statcard', statcardRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/duel', duelRoutes);
  app.use('/webhook', webhookRoutes);
  
  // Page routes - serve HTML files without extension
  app.get('/statcard', (req, res) => {
    res.sendFile(join(publicDir, 'statcard.html'));
  });
  
  app.get('/card', (req, res) => {
    res.sendFile(join(publicDir, 'card-embed.html'));
  });

  // Duel page - serve duel.html for base /duel route
  app.get('/duel', (req, res) => {
    res.sendFile(join(publicDir, 'duel.html'));
  });
  
  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Test command responses (for demo/debugging)
  app.get('/test-commands', (req, res) => {
    const commands: Record<string, string> = {
      '!card': 'Your StatCard - Estevan Guerra\n\nTier: Silver\nElo: 1031\nOverall: 52/99\nArchetype: Engineering\n\nStats:\nTechnical: 60\nStrategy: 50\nExecution: 50\nAura: 50\nExperience: 50\n\nView full card: http://localhost:3000/statcard',
      '!ranks': 'Leaderboard\n\n1. Estevan Guerra - 1031 Elo (Silver)\n2. Sarah Kim - 980 Elo (Bronze)\n3. Mike Johnson - 920 Elo (Bronze)\n4. Emma Davis - 870 Elo (Bronze)\n5. James Wilson - 820 Elo (Bronze)\n\nYour rank: #1',
      '!stats': 'Your Progress - Estevan Guerra\n\nTier: Silver -> Gold (69 pts away!)\nElo: 1031\nOverall: 52/99\nStreak: 3 days\nDuels: 5 played\n\nStats:\nTechnical: 60 (+10 from duels)\nStrategy: 50\nExecution: 50\nAura: 50\nExperience: 50',
      '!connect': 'Connect with Great People!\n\nFound 3 users with similar stats:\n\n1. Sarah Kim - Engineering, 980 Elo\n   TEC: 55 | STR: 48\n\n2. Mike Johnson - Engineering, 920 Elo\n   TEC: 48 | STR: 52\n\n3. Emma Davis - Engineering, 870 Elo\n   TEC: 45 | STR: 50\n\nSend them a message to connect!',
      '!synergize': 'Synergistic Matches\n\nTeammates whose strengths complement yours:\n\n1. Sarah Kim - 85% synergy\n   Bronze | 980 Elo\n   Strong Strategy complements your Technical\n\n2. Mike Johnson - 78% synergy\n   Bronze | 920 Elo\n   Strong Execution complements your Strategy\n\n3. Emma Davis - 72% synergy\n   Bronze | 870 Elo\n   Strong Aura complements your Experience\n\nTeam up for better results!',
      '!duel @user': 'Duel created between @8136 and @8837\n\nArchetype: engineering\nMetric: technical\nDuration: 30m\n\nOpen your challenge here:\nhttp://localhost:3000\n\nThey can accept with: !accept demo'
    };
    
    let commandsHtml = '';
    for (const [cmd, response] of Object.entries(commands)) {
      commandsHtml += '<div class="command"><div class="command-name">' + cmd + '</div><div class="command-response">' + response.replace(/\n/g, '<br>') + '</div></div>';
    }
    
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Command Responses</title>
          <style>
            body { 
              font-family: system-ui; 
              max-width: 800px; 
              margin: 50px auto; 
              padding: 20px; 
              background: #1a1a2e;
              color: #fff;
            }
            h1 { color: #d4a84b; }
            h2 { color: #a0a0a0; margin-top: 30px; }
            .command { 
              background: #2a2a3e; 
              padding: 15px 20px; 
              border-radius: 8px; 
              margin: 10px 0;
              border-left: 4px solid #d4a84b;
            }
            .command-name { 
              color: #4ade80; 
              font-weight: bold;
              font-size: 18px;
              margin-bottom: 10px;
            }
            .command-response { 
              white-space: pre-wrap; 
              font-family: monospace;
              font-size: 14px;
              line-height: 1.6;
            }
            a { color: #d4a84b; }
          </style>
        </head>
        <body>
          <h1>⚔️ Test Command Responses</h1>
          <p>These are the hardcoded responses that will be sent when commands come through Series chat.</p>
          ${commandsHtml}
          <h2>Quick Links</h2>
          <ul>
            <li><a href="/statcard">View StatCard</a></li>
            <li><a href="/duel/demo">View Duel Challenge</a></li>
          </ul>
        </body>
      </html>
    `);
  });

  // Root route - serve the intro/landing page with Spline background
  app.get('/', (req, res) => {
    res.sendFile(join(publicDir, 'index.html'));
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
