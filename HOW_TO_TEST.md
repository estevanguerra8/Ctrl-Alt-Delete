# 🧪 How to Actually Test Your Service

## Where to Send Messages

### Option 1: Use Your Phone's iMessage (Recommended)
1. **Open iMessage** on your iPhone or Mac
2. **Send a message** to the number: `+16463458837` (your Series sender number)
3. **Type a command** like: `!card`
4. **Watch your terminal** - you should see the message being processed

### Option 2: Use Series Dashboard/Web Interface
1. **Go to your Series dashboard** (where you got your credentials)
2. **Look for a chat/messaging interface**
3. **Send a message** with a command like: `!card`
4. **Watch your terminal** for logs

### Option 3: Test with API Directly (Advanced)
You can simulate a message by sending a test event to Kafka, but this is more complex.

## What Commands to Test

Send these in your Series chat:

- `!card` - Get your StatCard summary
- `!progress` - See your progress
- `!leaderboard` - View leaderboard
- `!duel @user123 engineering 30m` - Create a duel (replace @user123 with actual user)

## What to Look For

### ✅ Service is Working If:
1. **Terminal shows**: `Received message from topic...`
2. **Terminal shows**: `[Processing command: !card]`
3. **You get a response** back in Series chat

### ❌ Service Has Issues If:
1. **No logs appear** when you send messages
2. **Error messages** in terminal
3. **No response** in Series chat

## Important Notes

- **The service listens to Kafka** - messages sent to Series go through Kafka
- **Your service processes them** - when you send `!card`, your service receives it via Kafka
- **Service sends response** - your service sends a reply back via Series API

## Troubleshooting

### "I don't see any messages in terminal"
- Check that Kafka is connected (look for "Kafka consumer connected" in logs)
- Verify your Series API key is set correctly
- Make sure you're sending to the right number/chat

### "I don't know where Series chat is"
- Series is an iMessage service
- You might need to use the Series dashboard web interface
- Or send iMessages to the configured number

### "How do I access Series?"
- Go to the Series dashboard where you got your credentials
- Look for a messaging/chat interface
- Or use iMessage on your phone/Mac

