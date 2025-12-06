# Series StatCard Service

A gamified StatCard system for the Series "Future Feels Human" Hackathon.

## Features

- **StatCard System**: User profiles with gamified statistics
- **Async Duel System**: Head-to-head challenges via Series chat commands
- **Challenge Engine**: LLM-powered or template-based challenge generation
- **Elo Rating**: Blended rating system across multiple archetypes
- **Leaderboards**: Track rankings and progress

## Architecture

- Single Node.js + TypeScript service
- Kafka consumer for Series events
- HTTP server (Express) for API and static files
- In-memory data with JSON persistence

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

3. Build:
```bash
npm run build
```

4. Run:
```bash
npm start
```

For development:
```bash
npm run dev
```

## Commands

- `!card` - Show your StatCard summary
- `!duel @user archetype duration` - Initiate a duel
- `!accept duelId` - Accept a pending duel
- `!duel_status duelId` - Check duel status
- `!leaderboard [metric]` - View leaderboard
- `!progress` - View your progress over time

## API Endpoints

- `GET /api/statcard/:userId` - Get user's StatCard
- `GET /duel/:id` - Get duel challenge page
- `POST /duel/:id/submit` - Submit duel solution
