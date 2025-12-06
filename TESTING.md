# Testing Guide

## Quick Start Testing

### 1. Start the Service
```bash
npm start
```

The service should:
- ✅ Start HTTP server on port 3000
- ✅ Connect to Kafka
- ✅ Subscribe to your topic
- ✅ Show "Service ready and waiting for events"

### 2. Run Automated Tests
```bash
npm test
```

This will test:
- Health check endpoint
- StatCard API endpoints
- Duel API endpoints
- Kafka event format validation

### 3. Manual API Testing

#### Test Health Check
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{"status":"ok","timestamp":"2025-12-06T..."}
```

#### Test StatCard API
```bash
# Get statcard for a user (will return 404 if user doesn't exist)
curl http://localhost:3000/api/statcard/testuser123
```

#### Test Duel Endpoint
```bash
# Get duel info (will return 404 if duel doesn't exist)
curl http://localhost:3000/duel/test-duel-id
```

### 4. Test Kafka Message Processing

#### Option A: Send a Real Message via Series
1. Open your Series chat
2. Send a message starting with `!card` (e.g., `!card`)
3. Check the service logs - you should see:
   - `Received message from topic...`
   - The command being processed

#### Option B: Simulate Kafka Event (Manual)
You can use the `kafkaProducer.ts` script to send test messages:

```bash
npm run demo
```

Or manually send a test event using the Series Kafka topic.

### 5. Test Commands

Once the service is running and receiving messages, test these commands:

#### `!card`
Shows your StatCard summary
```
!card
```

#### `!duel`
Create a duel challenge
```
!duel @user123 engineering 30m
```

#### `!accept`
Accept a pending duel
```
!accept duel-id-here
```

#### `!leaderboard`
View leaderboard
```
!leaderboard
```

#### `!progress`
View your progress
```
!progress
```

## Testing Checklist

- [ ] Service starts without errors
- [ ] HTTP server responds to health check
- [ ] Kafka connects successfully
- [ ] Can receive messages from Series
- [ ] Commands are processed correctly
- [ ] StatCard API returns data
- [ ] Duel creation works
- [ ] Notifications are sent

## Troubleshooting

### Service won't start
- Check if port 3000 is available: `lsof -ti:3000`
- Kill existing process: `lsof -ti:3000 | xargs kill -9`

### Kafka connection fails
- Verify `.env` file has correct Kafka credentials
- Check network connection to Confluent Cloud
- Verify topic name matches exactly

### Messages not being processed
- Check service logs for errors
- Verify message format matches Series event structure
- Ensure message starts with `!` for commands

### API endpoints not working
- Verify service is running: `curl http://localhost:3000/health`
- Check logs for errors
- Verify routes are mounted correctly

