# Quick Start Guide

## Prerequisites

- Node.js (v16+)
- MongoDB running locally or connection string
- Two browsers or browser profiles (for testing calls)

## Setup (5 minutes)

### 1. Backend Setup

```bash
cd backend
npm install

# Create .env file
echo "MONGO_URI=mongodb://localhost:27017/dereeves" > .env
echo "JWT_SECRET=your-super-secret-key-change-this-in-production" >> .env

# Start backend
npm run dev
```

**Expected output:**
```
✅ MongoDB connected: localhost
✅ Server running on port 5000
🔌 Socket.IO server ready
```

### 2. Frontend Setup

```bash
cd frontend
npm install

# Start frontend
npm run dev
```

**Expected output:**
```
▲ Next.js 15.5.4
- Local:        http://localhost:3000
```

### 3. Create Test Accounts

#### Option A: Via Registration Page

1. Open http://localhost:3000/register
2. Create an admin account:
   - Name: Admin User
   - Email: admin@test.com
   - Password: admin123
3. Manually set role to admin in MongoDB (see below)
4. Create a regular user:
   - Name: Test User
   - Email: user@test.com
   - Password: user123

#### Option B: Via MongoDB Shell

```javascript
use dereeves;

// Create admin
db.users.insertOne({
  name: "Admin User",
  email: "admin@test.com",
  password: "$2a$10$YourHashedPasswordHere", // Use registration page or hash manually
  role: "admin",
  createdAt: new Date(),
  updatedAt: new Date()
});

// Create user
db.users.insertOne({
  name: "Test User",
  email: "user@test.com",
  password: "$2a$10$YourHashedPasswordHere",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date()
});
```

#### Convert User to Admin (MongoDB Shell)

```javascript
db.users.updateOne(
  { email: "admin@test.com" },
  { $set: { role: "admin" } }
);
```

## Testing the Features

### Test 1: Online Status

**Setup:**
1. **Browser 1**: Login as admin → http://localhost:3000/login
2. **Browser 2**: Login as user (incognito/different profile)

**Expected:**
- ✅ Admin sees user in sidebar with **green dot** (online)
- ✅ User sees admin with **green dot** in header
- ✅ Both see "Online" status text

**Test Offline:**
1. Close Browser 2
2. Wait 2 seconds
3. Admin should see user with **gray dot** and "Last seen X seconds ago"

### Test 2: Admin Calls User

**Setup:**
1. Both logged in (online)
2. Admin dashboard open with user list visible
3. User chat page open

**Steps:**
1. **Admin**: Click 📞 (voice) or 📹 (video) button next to user
2. **Admin**: Should see "Calling..." modal
3. **User**: Should see incoming call modal with admin name
4. **User**: Click "Accept"
5. **Both**: Should see call timer counting up
6. **Test**: Mute/unmute buttons
7. **Either**: Click "End Call"

**Expected:**
- ✅ Call connects within 2-3 seconds
- ✅ Audio/video works on both sides
- ✅ Controls (mute, video toggle) work
- ✅ Call ends cleanly when either clicks End

### Test 3: User Calls Admin

**Setup:**
1. Both logged in (online)
2. User chat page open with admin online

**Steps:**
1. **User**: Click 📞 or 📹 in header
2. **User**: Should see "Calling..." modal
3. **Admin**: Should see incoming call modal with user name
4. **Admin**: Click "Accept"
5. **Test**: All call features

**Expected:**
- ✅ Same as Test 2 but reversed direction

### Test 4: Call Rejection

**Steps:**
1. Start call (either direction)
2. Receiver: Click "Reject" instead of "Accept"

**Expected:**
- ✅ Caller sees "Call was rejected" alert
- ✅ Both modals close
- ✅ No connection established

### Test 5: Call Timeout

**Steps:**
1. Start call (either direction)
2. Don't answer for 30 seconds

**Expected:**
- ✅ After 30 seconds: "Call timed out" alert
- ✅ Both modals close automatically

## Verification Checklist

After setup, verify:

- [ ] Backend running on port 5000
- [ ] Frontend running on port 3000
- [ ] MongoDB connected (check backend logs)
- [ ] Admin account exists with `role: "admin"`
- [ ] Regular user account exists with `role: "user"`
- [ ] Both can login successfully
- [ ] Socket connection shows in console: `✅ Socket connected`
- [ ] Online status displays correctly
- [ ] Calls work bidirectionally
- [ ] Call acceptance/rejection works
- [ ] Audio/video streams work

## Common First-Time Issues

### "Cannot connect to MongoDB"
```bash
# Check if MongoDB is running
mongosh
# or
mongo
```

If not running, start MongoDB:
```bash
# Windows (if installed as service)
net start MongoDB

# Mac (Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

### "Port 5000 already in use"
```bash
# Find process using port 5000
# Windows
netstat -ano | findstr :5000

# Mac/Linux
lsof -ti:5000

# Kill the process or change port in backend/src/server.js
```

### "Camera/Microphone permission denied"
1. Click the camera icon in browser address bar
2. Select "Always allow"
3. Refresh the page
4. Try the call again

### "Admin sees empty user list"
- Register at least one regular user (role: "user")
- Admin dashboard only shows non-admin users
- Check browser console for fetch errors

## Next Steps

Once everything works:

1. **Read**: `IMPLEMENTATION_SUMMARY.md` for technical details
2. **Troubleshooting**: See `TROUBLESHOOTING.md` if issues arise
3. **Production**: Update CORS origins and socket URL for deployment
4. **Security**: Change `JWT_SECRET` to a strong random value
5. **TURN Servers**: Add for production WebRTC reliability

## Success Indicators

You'll know it's working when:
- ✅ Green console logs dominate (very few red errors)
- ✅ Online indicators update in real-time
- ✅ Calls connect within seconds
- ✅ You can hear/see each other during calls
- ✅ No socket disconnection issues

## Debug Console Commands

```javascript
// Check socket status
console.log("Socket:", socket.connected, socket.id);

// Request online users
socket.emit("get-online-users");

// Check current user
console.log("User:", JSON.parse(localStorage.getItem("user")));

// Check token
console.log("Token:", localStorage.getItem("token"));
```

---

**Estimated setup time**: 5-10 minutes  
**First successful call**: Within 15 minutes  

Need help? Check `TROUBLESHOOTING.md` or the browser/backend console logs!



