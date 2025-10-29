# Troubleshooting Guide

## Common Issues & Solutions

### 1. "Online status not showing"

**Symptoms:**
- User/admin always appears offline
- Green indicator never shows

**Solutions:**
1. Check browser console for socket connection errors
2. Verify both backend and frontend are running
3. Check that socket connects: Look for `✅ Socket connected` in console
4. Verify registration: Look for `✅ Registered user` in backend logs
5. Check `online-users-list` event arrives: Look for `📋 Online users list received` in console

**Debug Commands:**
```javascript
// In browser console
console.log("Socket connected:", socket.connected);
console.log("Socket ID:", socket.id);
socket.emit("get-online-users"); // Manually request
```

### 2. "Incoming call modal doesn't appear"

**Symptoms:**
- Caller sees "Calling..." but receiver sees nothing
- No incoming call notification

**Solutions:**
1. Check receiver's console for `📞 INCOMING CALL RECEIVED` log
2. Verify receiver is registered: Check for `register` event emission
3. Check backend logs for `📞 Forwarding call to socket` message
4. Verify receiver's user ID matches what backend has
5. Check if `showIncomingModal` state updates in receiver's React DevTools

**Debug Backend:**
```bash
# Backend should show:
📞 ========== CALL INITIATED ==========
📞 From: <caller-id>
📞 To: <receiver-id>
✅ Forwarding call to socket: <socket-id>
```

### 3. "Call connects but no audio/video"

**Symptoms:**
- Call status shows "active" but no media streams
- Remote video/audio not working

**Solutions:**
1. Check browser permissions: Camera/Mic must be allowed
2. Verify media constraints in CallModal
3. Check for WebRTC errors in console
4. Verify both peers received streams: Look for `📺 REMOTE STREAM RECEIVED`
5. Try refreshing and granting permissions again

**Browser Permissions:**
- Chrome: Settings → Privacy → Site Settings → Camera/Microphone
- Firefox: Page Info → Permissions
- Edge: Site permissions in address bar

### 4. "Login fails with AxiosError"

**Symptoms:**
- Login button click shows "Login failed: AxiosError"
- Network error or timeout

**Solutions:**
1. Check if backend is running on port 5000
2. Verify `NEXT_PUBLIC_API_URL` or use default `http://localhost:5000/api`
3. Check CORS settings in backend allow `http://localhost:3000`
4. Open Network tab in DevTools and check request status
5. Check backend console for incoming request

**Check Backend is Running:**
```bash
curl http://localhost:5000/api/auth/profile
# Should return 401 (Unauthorized) if backend is up
```

### 5. "Admin dashboard shows empty user list"

**Symptoms:**
- Admin logged in but sees "No users yet"
- Network request succeeds but array is empty

**Solutions:**
1. Verify there are non-admin users in MongoDB
2. Check backend query: `User.find({ role: "user" })`
3. Register a test user via `/register` page
4. Check browser console for fetch errors
5. Verify token is valid (not expired)

**Create Test User:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'
```

### 6. "Call immediately ends or errors"

**Symptoms:**
- Call starts but immediately shows "Call Ended"
- WebRTC errors in console

**Solutions:**
1. Check for SDP errors in console (may be harmless - code handles them)
2. Verify both peers can access media devices
3. Check network connectivity (firewall blocking WebRTC?)
4. Try audio call first (requires fewer permissions)
5. Check if STUN server is reachable

**Test STUN Server:**
```javascript
// In browser console
const pc = new RTCPeerConnection({
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
});
pc.onicecandidate = e => console.log("ICE:", e.candidate);
pc.createOffer().then(offer => pc.setLocalDescription(offer));
```

### 7. "Socket keeps disconnecting"

**Symptoms:**
- `🔌 Socket disconnected` appears frequently
- Connection unstable

**Solutions:**
1. Check network stability
2. Verify backend is running and not crashing
3. Check backend logs for errors
4. Increase socket timeout in backend config
5. Check for CORS issues

**Backend Socket Config:**
```javascript
// In server.js - already configured
pingTimeout: 60000,     // 60 seconds
pingInterval: 25000,    // 25 seconds
```

### 8. "Token expired" errors

**Symptoms:**
- Sudden redirects to login
- 401 errors after some time

**Solutions:**
1. JWT tokens expire after 1 day (default)
2. Login again to get fresh token
3. For longer sessions, increase token expiry in `authcontroller.js`

**Update Token Expiry:**
```javascript
// In backend/src/controllers/authcontroller.js
const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
  expiresIn: "7d", // Change from "1d" to "7d" for 7 days
});
```

## Environment Setup Checklist

### Backend
- [ ] MongoDB running and accessible
- [ ] `MONGO_URI` set in `.env`
- [ ] `JWT_SECRET` set in `.env` (any random string)
- [ ] Port 5000 available
- [ ] `npm install` completed
- [ ] `npm run dev` shows "Server running on port 5000"

### Frontend
- [ ] Port 3000 available
- [ ] `npm install` completed
- [ ] `npm run dev` shows "Local: http://localhost:3000"
- [ ] `NEXT_PUBLIC_SOCKET_URL` set (optional, defaults to localhost:5000)

### Database
- [ ] At least one admin user exists (`role: "admin"`)
- [ ] At least one regular user exists (`role: "user"`)

**Create Admin User (MongoDB Shell):**
```javascript
use your_database_name;
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
);
```

## Debug Mode

Enable verbose logging:

### Frontend
All socket events are already logged. Check browser console for:
- `✅` Green checkmarks = Success
- `❌` Red X = Errors
- `📡` Antenna = Network/Socket events
- `📞` Phone = Call events
- `👥` People = User/presence events

### Backend
All events logged to terminal. Look for:
- `🔌` Connection events
- `📡` Registration events
- `📞` Call events
- `🔴` Disconnection events

## Getting Help

If issues persist:
1. Check both browser console AND backend terminal logs
2. Copy relevant error messages
3. Note what action triggered the error
4. Check if issue occurs for both admin and user
5. Try in incognito mode (fresh state)

## Performance Tips

- Close unnecessary tabs (WebRTC is resource-intensive)
- Use wired connection for better call quality
- Close other apps using camera/microphone
- For production, use dedicated TURN servers
- Monitor network bandwidth during calls


