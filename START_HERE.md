# 🚀 How to Start and Test Your Service

## Step 1: Make Sure You Have Your Series API Key

1. Go to your Series dashboard
2. Find your **API Key** (different from Kafka credentials)
3. Open your `.env` file
4. Replace this line:
   ```
   SERIES_API_KEY=your_series_api_key_here
   ```
   With your actual API key:
   ```
   SERIES_API_KEY=your_actual_api_key_from_dashboard
   ```

## Step 2: Start the Service

In your terminal, run:
```bash
npm start
```

You should see:
```
[INFO] Starting Series StatCard Service...
[INFO] HTTP server listening on port 3000
[INFO] Kafka consumer connected
[INFO] ✅ Service ready and waiting for events
```

**Keep this terminal open!** The service needs to keep running.

## Step 3: Check if It's Working

### Option A: Browser Test
Open in your browser:
- `http://localhost:3000/health`

You should see: `{"status":"ok","timestamp":"..."}`

### Option B: Terminal Test
Open a **NEW terminal window** and run:
```bash
curl http://localhost:3000/health
```

## Step 4: Test with Real Messages

1. **Make sure your Series API key is set** in `.env`
2. **Send a message** in your Series chat (iMessage):
   - Type: `!card`
3. **Watch your terminal** (where `npm start` is running)
   - You should see logs showing the message was received and processed

## What You DON'T Need to Do

❌ You **DON'T** need to:
- Run anything from the Series dashboard
- Start Kafka manually (it connects automatically)
- Do anything special with credentials (they're in `.env`)

✅ You **ONLY** need to:
- Add your Series API key to `.env`
- Run `npm start`
- Send messages in Series chat

## Troubleshooting

### Service won't start?
```bash
# Check if port 3000 is in use
lsof -ti:3000

# Kill it if needed
lsof -ti:3000 | xargs kill -9

# Then try again
npm start
```

### No messages being processed?
- Check that `SERIES_API_KEY` is set in `.env` (not the placeholder)
- Make sure Kafka is connected (check logs for "Kafka consumer connected")
- Verify you're sending messages to the correct Series chat

### Can't find Series API key?
- Go to Series dashboard
- Look for "API Keys" or "Credentials" section
- It's different from the Kafka API key

