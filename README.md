# Series StatCard Service

A gamified, multi-profession StatCard + async duel system that lives inside **Series**.

## Quick Start

1. **Copy `.env.example` to `.env`** and fill in your credentials:
   - Series API credentials (see `iMessage Service API Docs.pdf`)
   - Kafka credentials (see `Series Hackathon Dashboard.pdf`)

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build:**
   ```bash
   npm run build
   ```

4. **Start:**
   ```bash
   npm start
   ```

## Core Flows

- Users send commands in Series chat:
  - `!card` - Get your stat card
  - `!leaderboard` - View leaderboard
  - `!duel @user technical 30m` - Challenge a user
  - `!progress` - View your progress

- Series pushes inbound messages to our **Kafka topic**
- Our **Kafka consumer** processes commands and sends responses via **Series HTTP API**
- Users click duel links → open our **duel page** (served by our HTTP server)

## Project Structure

```
src/
  ├── index.ts              # Main entry point
  ├── config/               # Configuration files
  ├── api/                  # HTTP server and routes
  ├── kafka/                # Kafka consumer
  ├── messaging/            # Series API client
  ├── core/                 # Core business logic
  ├── commands/              # Command handlers
  └── utils/                 # Utilities
```

## Environment Variables

All credentials and connection details are configured via `.env`. See `.env.example` for required variables.

## Development

```bash
npm run dev        # Run with ts-node
npm run demo       # Run demo events
npm run producer   # Test Kafka producer
npm run seed       # Seed challenge templates
```
