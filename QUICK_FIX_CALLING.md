# 🔧 Quick Fix: "Connection failed to establish"

## What's the Problem?

Your video/audio calls are timing out because you don't have a TURN server configured. Without TURN, calls only work when both users can connect directly (which often fails due to firewalls/NAT).

## ⚡ Fast Fix (2 minutes)

### Option 1: Use the Setup Script (Windows)

```cmd
setup-turn.bat
```

Choose option 1 (Free Public TURN) and press Enter. Done! ✅

### Option 2: Manual Setup

Create a file `frontend/.env.local` with:

```env
NEXT_PUBLIC_TURN_URL=turn:openrelay.metered.ca:80
NEXT_PUBLIC_TURN_USERNAME=openrelayproject
NEXT_PUBLIC_TURN_CREDENTIAL=openrelayproject
```

### Restart Your App

```cmd
cd frontend
npm run dev
```

## ✅ Test It

1. Make a video/audio call
2. Open browser console (press F12)
3. Look for these messages:
   - `🧭 Using TURN server from env: turn:openrelay.metered.ca:80`
   - `🧊 ICE candidate: relay` (this means TURN is working!)
   - `🌐 ICE state: connected` (connection successful!)

## 📚 More Info

- **For production apps**: Read `WEBRTC_TROUBLESHOOTING.md` to set up Xirsys or Twilio (more reliable)
- **For detailed debugging**: Check the console logs during calls
- **If still having issues**: Check `WEBRTC_TROUBLESHOOTING.md` → "Common Issues & Solutions"

## What Changed?

✅ Extended connection timeout from 20s to 30s
✅ Added comprehensive ICE connection monitoring
✅ Improved error messages with troubleshooting tips
✅ Enhanced TURN server configuration (supports TCP + UDP)
✅ Added detailed console logging for debugging

## Why Free TURN Isn't Ideal for Production

The free OpenRelay TURN server:
- ⚠️ Limited capacity (may be slow or unavailable)
- ⚠️ Shared by many users
- ⚠️ No SLA or guarantees

For production, use:
- **Xirsys** (~$10/month, free tier available)
- **Twilio** (pay-as-you-go, ~$0.40/GB)
- **Self-hosted** (full control, costs vary)

See `WEBRTC_TROUBLESHOOTING.md` for setup instructions.

