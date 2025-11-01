# 🔍 Debug: Calls Not Going Through

## Problem
One side places a call, but the other side doesn't receive it.

---

## 📋 Step-by-Step Debugging

### **Step 1: Check Both Users Are Online & Registered**

**On CALLER side (the one making the call):**
Open browser console (F12) and look for:
```
✅ Socket connected: [socket-id]
📡 [USER] Socket already connected, registering immediately
Socket registered user: [user-id]
```

**On RECEIVER side:**
Look for the same messages

**❌ If you DON'T see "Socket registered user":**
- Refresh the page
- Check if you're logged in
- Check network tab for errors

---

### **Step 2: Check Online Status**

**On CALLER side:**
When you try to call, you should see:
```
📞 ========== USER STARTING CALL ==========
📞 Admin ID: [admin-id]
📞 Is admin online: true  ← MUST BE TRUE
```

**❌ If "Is admin online" is FALSE:**
- The receiver isn't properly registered
- Refresh receiver's browser
- Wait a few seconds for socket to connect

---

### **Step 3: Make a Call and Watch Console**

**On CALLER side, you should see:**
```
📞 ========== USER STARTING CALL ==========
✅ Admin is online - starting call
🎬 ========== CALL MODAL OPENED ==========
📞 isInitiator: true
🎤 Requesting media permissions...
✅ Media stream obtained
🔗 Creating peer connection...
📡 ========== PEER SIGNAL GENERATED ==========
📡 Signal type: offer
📞 CALLER: Emitting callUser to: [admin-id]
✅ callUser emitted
```

**On RECEIVER side, you should see:**
```
🔔 [USER] Socket event received: "incomingCall" [data]
📞 ========== INCOMING CALL RECEIVED ==========
📞 Signal: Present
📞 From: [caller-id]
📞 Incoming call modal should be showing now
```

---

### **Step 4: Identify The Problem**

#### **Case A: CALLER logs show "Admin is offline"**
**Problem:** Receiver not registered or online status not synced

**Fix:**
1. Refresh receiver's browser
2. Wait 3-5 seconds
3. Try again

#### **Case B: CALLER logs show "callUser emitted" but RECEIVER sees nothing**
**Problem:** Socket signaling issue on backend

**Check Backend Logs:**
```bash
pm2 logs backend --lines 50
```

Look for:
```
📞 ========== CALL INITIATED ==========
📞 From: [caller-id]
📞 To: [receiver-id]
✅ Forwarding call to socket: [socket-id]
```

**❌ If backend shows "Receiver not found or offline":**
- Backend and frontend are out of sync
- Receiver needs to refresh

#### **Case C: RECEIVER sees "incomingCall" event but modal doesn't show**
**Problem:** Modal state issue

**Look for in RECEIVER console:**
```
📞 Incoming call modal should be showing now
📞 showIncomingModal: true
```

**Check:** Is the IncomingCallModal component rendering?

---

## 🔧 Common Fixes

### **Fix 1: Refresh Both Browsers**
Simple but often works:
1. Refresh RECEIVER browser first
2. Wait 5 seconds
3. Refresh CALLER browser
4. Wait 5 seconds
5. Try call again

### **Fix 2: Check Socket Connection Status**
In console on both sides:
```javascript
socket.connected  // Should be true
socket.id         // Should have a value
```

### **Fix 3: Manually Register**
If socket not registered, run in console:
```javascript
const user = JSON.parse(localStorage.getItem('user'));
socket.emit('register', { userId: user._id, role: user.role || 'user' });
```

### **Fix 4: Check Network Tab**
1. Open DevTools → Network tab
2. Filter by "WS" (WebSocket)
3. Look for socket.io connection
4. Should show "101 Switching Protocols" (green)
5. Click on it and check "Messages" tab

---

## 🎯 Quick Test Commands

### **Check if socket is working (run in console on both sides):**

```javascript
// Check connection
console.log('Socket connected:', socket.connected);
console.log('Socket ID:', socket.id);

// Check registration
const user = JSON.parse(localStorage.getItem('user'));
console.log('Current user:', user);

// Test echo
socket.emit('test', 'hello');
socket.on('test-response', (data) => console.log('Test response:', data));
```

---

## 🐛 If Nothing Works

### **Check Backend Is Running:**
```bash
pm2 status
```

Should show both backend and frontend online.

### **Restart Backend:**
```bash
pm2 restart backend
```

### **Check Backend Logs:**
```bash
pm2 logs backend --lines 100
```

Look for:
```
✅ Server running on port 5000
🔌 Socket.IO server ready
```

### **Check Frontend Environment:**
```bash
# In frontend directory
cat .env.local
```

Should show your TURN server config.

---

## 📝 Report Format

If still not working, provide:

1. **CALLER Console Logs** (copy everything after clicking call button)
2. **RECEIVER Console Logs** (copy everything from the moment call is initiated)
3. **Backend Logs** (pm2 logs backend --lines 50)
4. **Socket Status** (socket.connected, socket.id on both sides)
5. **Online Status** (Are both showing as online to each other?)

---

## 🔍 Most Likely Causes

Based on "call isn't going through at all":

1. **Socket not connected** (90% of cases)
   - Solution: Refresh browser, wait for connection

2. **User not registered** (80% of cases)
   - Solution: Check for "Socket registered user" log

3. **Backend not forwarding** (20% of cases)
   - Solution: Check backend logs, restart backend

4. **Modal not showing** (10% of cases)
   - Solution: Check React state, look for rendering errors

---

## ✅ Expected Working Flow

```
CALLER                          BACKEND                    RECEIVER
  |                                |                           |
  |------ callUser --------------->|                           |
  |                                |------ incomingCall ------>|
  |                                |                           |
  |                                |<----- answerCall ---------|
  |<----- callAccepted ------------|                           |
  |                                |                           |
  |<========== PEER CONNECTION ESTABLISHED ==================>|
  |                                |                           |
```

Each arrow should have console logs showing the event.

