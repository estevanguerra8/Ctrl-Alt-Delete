# Quick Testing Guide - Your Service is Running! 🚀

## 🌐 Test in Your Browser

### 1. Health Check
Open in browser:
```
http://localhost:3000/health
```
You should see: `{"status":"ok","timestamp":"..."}`

### 2. StatCard API
Open in browser:
```
http://localhost:3000/api/statcard/testuser
```
You should see: `{"error":"User not found"}` (this is correct for a new user)

### 3. Duel Challenge Page
Open in browser:
```
http://localhost:3000/duel/test-duel-id
```
You should see: `{"error":"Duel not found"}` (this is correct for a non-existent duel)

## 📱 Test with Real Series Messages

### Step 1: Make sure your Series API key is set
Check your `.env` file - make sure `SERIES_API_KEY` has your actual API key (not the placeholder).

### Step 2: Send a message in Series
1. Open your Series chat (iMessage)
2. Send one of these commands:
   - `!card` - Get your StatCard
   - `!progress` - See your progress
   - `!leaderboard` - View leaderboard

### Step 3: Watch your terminal
You should see logs like:
```
Received message from topic team.team.4a646f406e2c4e3c9796d790c4dd5a78, partition 0
[Processing command: !card]
```

## 🧪 Test Commands in Terminal

### Test Health Endpoint
```bash
curl http://localhost:3000/health
```

### Test StatCard Endpoint
```bash
curl http://localhost:3000/api/statcard/testuser
```

### Test Duel Endpoint
```bash
curl http://localhost:3000/duel/test-id
```

## 📊 What to Look For

### ✅ Service is Working If:
- Health check returns `{"status":"ok"}`
- API endpoints return JSON (even if errors)
- You see logs in terminal when messages arrive
- Kafka shows "Consumer has joined the group"

### ❌ Service Has Issues If:
- Health check fails (connection refused)
- No logs appear when you send messages
- Kafka connection errors

## 🎯 Full Test Flow

1. **Service Running** ✅ (you have this)
2. **Test Health**: Visit `http://localhost:3000/health` in browser
3. **Test API**: Visit `http://localhost:3000/api/statcard/testuser` in browser
4. **Test Real Message**: Send `!card` in Series chat
5. **Check Logs**: Watch terminal for processing messages

## 💡 Pro Tips

- Keep the terminal with `npm start` running
- Open a new terminal for curl commands
- Use browser for quick visual checks
- Watch terminal logs to see message processing

