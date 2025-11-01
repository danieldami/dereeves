# WebRTC Connection Troubleshooting Guide

## Problem: "Connection failed to establish. Please try again."

This error occurs when the WebRTC peer-to-peer connection cannot be established within 30 seconds. This is usually due to network/firewall restrictions or the lack of a TURN server.

---

## Quick Fix (5 minutes)

### Step 1: Create Environment File

Create a file named `frontend/.env.local` with the following content:

```env
# Free public TURN server (Option 1 - Quick testing)
NEXT_PUBLIC_TURN_URL=turn:openrelay.metered.ca:80
NEXT_PUBLIC_TURN_USERNAME=openrelayproject
NEXT_PUBLIC_TURN_CREDENTIAL=openrelayproject
```

### Step 2: Restart Your Frontend

```bash
cd frontend
npm run dev
```

### Step 3: Test the Call

Open your browser's Developer Console (F12) and look for these logs when you make a call:

- ✅ **Good signs:**
  - `🧭 Using TURN server from env: turn:openrelay.metered.ca:80`
  - `🌐 ICE state: connected` or `🌐 ICE state: completed`
  - `🧊 ICE candidate: relay` (this means TURN is working)

- ❌ **Bad signs:**
  - `⚠️ No TURN credentials provided. Using STUN only.`
  - `🌐 ICE state: failed`
  - Only seeing `🧊 ICE candidate: host` or `srflx` (no `relay`)

---

## Understanding the Issue

### What is STUN vs TURN?

- **STUN** (Session Traversal Utilities for NAT)
  - Helps discover your public IP address
  - Works for direct peer-to-peer connections
  - **Fails** when both users are behind restrictive NATs/firewalls

- **TURN** (Traversal Using Relays around NAT)
  - Relays media through a server when direct connection fails
  - **Required** for users behind restrictive NATs
  - Costs bandwidth but ensures connections always work

### Why Do I Need TURN?

If you or the person you're calling are behind:
- Corporate firewalls
- Symmetric NAT
- Mobile networks (4G/5G)
- Some residential routers

Then STUN alone won't work. You need TURN to relay the connection.

---

## Better Solutions (Production-Ready)

### Option 1: Xirsys (Recommended for Production)

1. Sign up at https://xirsys.com/ (free tier available)
2. Create a new application
3. Get your TURN server credentials
4. Update `frontend/.env.local`:

```env
NEXT_PUBLIC_TURN_URL=turn:your-turn-server.xirsys.com:3478
NEXT_PUBLIC_TURN_USERNAME=your-username-from-xirsys
NEXT_PUBLIC_TURN_CREDENTIAL=your-credential-from-xirsys
```

### Option 2: Twilio TURN (Most Reliable)

1. Sign up at https://www.twilio.com/
2. Get TURN credentials from Twilio Network Traversal Service
3. Update `frontend/.env.local`:

```env
NEXT_PUBLIC_TURN_URL=turn:global.turn.twilio.com:3478
NEXT_PUBLIC_TURN_USERNAME=your-twilio-username
NEXT_PUBLIC_TURN_CREDENTIAL=your-twilio-credential
```

### Option 3: Self-Hosted TURN Server (Advanced)

If you want full control, you can set up your own TURN server using Coturn:

#### Install Coturn (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install coturn
```

#### Configure Coturn

Edit `/etc/turnserver.conf`:

```conf
# Basic configuration
listening-port=3478
tls-listening-port=5349
listening-ip=YOUR_SERVER_IP
external-ip=YOUR_SERVER_IP

# Authentication
lt-cred-mech
user=myuser:mypassword
realm=yourdomain.com

# Relay settings
min-port=49152
max-port=65535

# Logging
verbose
```

#### Start Coturn

```bash
sudo systemctl start coturn
sudo systemctl enable coturn
```

#### Update your app

```env
NEXT_PUBLIC_TURN_URL=turn:your-server.com:3478
NEXT_PUBLIC_TURN_USERNAME=myuser
NEXT_PUBLIC_TURN_CREDENTIAL=mypassword
```

---

## Testing Your TURN Server

### Test with Trickle ICE

Visit: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/

1. Remove the default STUN server
2. Add your TURN server with credentials
3. Click "Gather candidates"
4. Look for candidates with `typ relay` - this confirms TURN is working

### Test in Your App

1. Open browser console (F12)
2. Make a call
3. Look for these logs:

```
🧭 Using TURN server from env: turn:...
🧊 ICE candidate: relay ...
🌐 ICE state: connected
✅ In call with [user]
```

---

## Changes Made to Fix Your Issue

### 1. Increased Connection Timeout
- Changed from 20 seconds to 30 seconds
- Gives more time for TURN relays to establish

### 2. Enhanced ICE Connection Monitoring
- Added detailed logging of ICE states
- Shows when connection fails and why
- Logs ICE candidates (host, srflx, relay)

### 3. Improved Error Messages
- Shows specific error based on ICE state
- Provides troubleshooting tips
- Explains TURN server requirement

### 4. Better TURN Configuration
- Supports multiple TURN servers
- Automatically adds TCP variant (port 443/5349)
- Comprehensive warning when TURN is missing

---

## Common Issues & Solutions

### Issue: Still getting "Connection failed" with TURN configured

**Solution:**
1. Check browser console for TURN server errors
2. Verify credentials are correct
3. Try a different TURN provider (Xirsys or Twilio)
4. Check if your firewall blocks TURN ports (3478, 5349)

### Issue: Works sometimes but not always

**Solution:**
- This is typical without TURN
- STUN works when direct connection is possible
- Configure TURN for 100% reliability

### Issue: "TURN server is not responding"

**Solution:**
1. Test TURN server with Trickle ICE tool
2. Check if TURN server is online
3. Verify credentials haven't expired
4. Try using port 443 instead of 3478

### Issue: High latency during calls

**Solution:**
- TURN adds latency by relaying traffic
- Use TURN servers geographically close to users
- Consider setting up regional TURN servers
- Twilio has global TURN servers for best latency

---

## Monitoring & Debugging

### Check ICE Candidates in Console

When a call starts, you'll see logs like:

```
🧊 ICE candidate: host candidate:192.168.1.100...
🧊 ICE candidate: srflx candidate:203.0.113.10...
🧊 ICE candidate: relay candidate:198.51.100.5...
```

- **host**: Your local IP (won't work across networks)
- **srflx**: Your public IP via STUN (works if both users can connect directly)
- **relay**: TURN relay address (always works, even behind NATs)

### Monitor ICE Connection State

```
🌐 ICE state: new
🌐 ICE state: checking
🌐 ICE state: connected     ✅ Success!
```

Or:

```
🌐 ICE state: new
🌐 ICE state: checking
🌐 ICE state: failed        ❌ No direct connection + No TURN
```

---

## Cost Considerations

### Free Options
- OpenRelay (metered.ca): Limited, good for testing
- Xirsys Free Tier: 500 MB/month
- Some cloud providers offer free TURN in their free tier

### Paid Options
- Xirsys: ~$10-50/month depending on usage
- Twilio: Pay-as-you-go, ~$0.40/GB
- Self-hosted: Server costs + bandwidth

### Bandwidth Usage
- Video call: ~1-2 MB/minute per user
- Audio call: ~0.1-0.5 MB/minute per user
- TURN only used when direct connection fails (typically 20-30% of calls)

---

## Next Steps

1. ✅ Create `frontend/.env.local` with TURN credentials (done above)
2. ✅ Restart your frontend server
3. ✅ Test a call and check browser console
4. ✅ Verify you see "ICE candidate: relay" in logs
5. ✅ Confirm call connects successfully

If issues persist, check the console logs and refer to the "Common Issues" section above.

---

## Additional Resources

- [WebRTC Troubleshooting](https://webrtc.org/getting-started/testing)
- [Trickle ICE Test Tool](https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/)
- [Coturn Documentation](https://github.com/coturn/coturn)
- [Xirsys Dashboard](https://xirsys.com/)
- [Twilio TURN](https://www.twilio.com/docs/stun-turn)

