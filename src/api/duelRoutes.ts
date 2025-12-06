import { Router, Request, Response } from 'express';
import { getDuel, submitDuelAnswer } from '../core/duelManager';
import * as challengeEngine from '../core/challenge/engine';
import { generateId } from '../utils/validation';
import { Submission } from '../core/types';
import { logger } from '../utils/logging';
import { readFileSync } from 'fs';
import { join } from 'path';

export const duelRoutes = Router();

/**
 * GET /duel/:id
 * If Accept header is HTML, serve duel.html
 * Otherwise, return JSON like { duel, challenge, time } for the frontend
 */
duelRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // If browser is requesting HTML (normal page load), serve the HTML page
    const acceptsHtml = req.headers.accept && req.headers.accept.includes('text/html');
    if (acceptsHtml && !req.query.json) {
      const duelHtmlPath = join(process.cwd(), 'public', 'duel.html');
      try {
        const html = readFileSync(duelHtmlPath, 'utf-8');
        logger.info(`Serving HTML for duel ${id}`);
        return res.type('text/html').send(html);
      } catch (err: any) {
        logger.error('Error reading duel.html:', err);
        return res.status(500).send(`<h1>Error loading duel page</h1><p>${err.message}</p>`);
      }
    }
    
    // Otherwise, return JSON (for API calls from JavaScript)
    const duel = getDuel(id);
    
    if (!duel) {
      return res.status(404).json({ error: 'Duel not found' });
    }
    
    // Ensure there is a challenge for this duel
    const challenge = await challengeEngine.startChallengeForDuel(duel);
    
    // Calculate remaining time
    // Timer starts when duel is created, stops when user submits
    const now = Date.now();
    let remainingMs: number | null = null;
    let timerStarted = false;
    
    if (duel.startTime) {
      // Timer has started
      timerStarted = true;
      const endTime = duel.startTime + (duel.durationMinutes * 60 * 1000);
      remainingMs = Math.max(0, endTime - now);
    } else {
      // Timer hasn't started yet
      timerStarted = false;
      remainingMs = null;
    }
    
    // Return minimal but sufficient data for frontend
    return res.json({
      duel: {
        id: duel.id,
        archetype: duel.archetype,
        metric: duel.metric,
        challengerId: duel.challengerId,
        opponentId: duel.opponentId,
        durationMinutes: duel.durationMinutes,
        status: duel.status,
        scores: duel.scores,
        feedback: duel.feedback || {}, // Include feedback for comparison
      },
      challenge: {
        id: challenge.id,
        title: challenge.title,
        prompt: challenge.prompt,
        difficulty: challenge.difficulty,
      },
      time: {
        now,
        remainingMs,
        timerStarted,
      },
    });
  } catch (error: any) {
    logger.error('Error fetching duel:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /duel/:id/submit
 * Parse submission (userId, answer)
 * Use Challenge Engine to grade
 * Update Duel and UserState
 * Return simple result JSON
 */
duelRoutes.post('/:id/submit', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, answer } = req.body ?? {};
    
    if (!userId || typeof answer !== 'string') {
      return res.status(400).json({ error: 'userId and answer are required' });
    }
    
    const duel = getDuel(id);
    if (!duel) {
      return res.status(404).json({ error: 'Duel not found' });
    }
    
    // submitDuelAnswer handles: creating submission, grading, storing score and feedback
    const duelAfterSubmission = await submitDuelAnswer(id, userId, answer);
    
    if (!duelAfterSubmission) {
      return res.status(500).json({ error: 'Failed to submit answer' });
    }
    
    // Get the feedback that was stored in the duel
    const userFeedback = duelAfterSubmission.feedback?.[userId];
    
    if (!userFeedback) {
      return res.status(500).json({ error: 'Failed to retrieve feedback' });
    }
    
    // Return score, feedback, and comparison data
    const response: any = {
      duelId: id,
      userId,
      score: userFeedback.score,
      feedback: userFeedback.feedback,
      strengths: userFeedback.strengths,
      improvements: userFeedback.improvements,
      timeElapsed: userFeedback.timeElapsed, // Include time elapsed when submitted
    };
    
    // If both have submitted, include comparison and send message via Series API
    if (duelAfterSubmission.feedback && duelAfterSubmission.feedback[duelAfterSubmission.challengerId] && duelAfterSubmission.feedback[duelAfterSubmission.opponentId]) {
      response.comparison = {
        challenger: duelAfterSubmission.feedback[duelAfterSubmission.challengerId],
        opponent: duelAfterSubmission.feedback[duelAfterSubmission.opponentId],
        winner: duelAfterSubmission.scores[duelAfterSubmission.challengerId] > duelAfterSubmission.scores[duelAfterSubmission.opponentId] 
          ? duelAfterSubmission.challengerId 
          : duelAfterSubmission.scores[duelAfterSubmission.opponentId] > duelAfterSubmission.scores[duelAfterSubmission.challengerId]
          ? duelAfterSubmission.opponentId
          : 'draw',
      };
      
      // The comparison message will be sent automatically by finalizeDuel
      // which is called when both have submitted
    }
    
    return res.json(response);
  } catch (error: any) {
    logger.error('Error submitting duel answer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
