//C:\Users\HP\dereeves\backend\src\server.js
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync, readFileSync } from "fs";
import cors from "cors";
import connectDB from "./utils/db.js";
import authRoutes from "./routes/authroutes.js";
import messageRoutes from "./routes/messageroutes.js";
import userRoutes from "./routes/userroutes.js";
import passwordRoutes from "./routes/passwordroutes.js";

// 🔧 Resolve current file and directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Load .env from one level above /src
const envPath = path.resolve(__dirname, "../.env");
console.log("📁 Loading .env from:", envPath);
console.log("📁 __dirname:", __dirname);

// Check if file exists
console.log("📁 .env file exists:", existsSync(envPath) ? "✅ Yes" : "❌ No");

// Always read .env file manually first (dotenv seems unreliable)
if (existsSync(envPath)) {
  try {
    console.log("📖 Reading .env file manually...");
    const envContent = readFileSync(envPath, 'utf8');
    const lines = envContent.split(/\r?\n/); // Handle both Unix and Windows line endings
    let loadedCount = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const equalIndex = trimmed.indexOf('=');
        if (equalIndex > 0) {
          const key = trimmed.substring(0, equalIndex).trim();
          const value = trimmed.substring(equalIndex + 1).trim();
          if (key && value) {
            // Remove quotes if present
            const cleanValue = value.replace(/^["']|["']$/g, '');
            process.env[key] = cleanValue;
            if (key === 'MONGO_URI' || key === 'JWT_SECRET') {
              console.log(`✅ Loaded ${key}: ${cleanValue.substring(0, 40)}...`);
            }
            loadedCount++;
          }
        }
      }
    }
    console.log(`📦 Loaded ${loadedCount} environment variables from .env file`);
  } catch (error) {
    console.error("❌ Error reading .env file manually:", error.message);
    // Fallback to dotenv
    console.log("🔄 Falling back to dotenv...");
    dotenv.config({ path: envPath, override: true });
  }
} else {
  // File doesn't exist, try dotenv anyway
  console.log("⚠️ .env file not found, trying dotenv default location...");
  dotenv.config({ override: true });
}

// Debug environment variables BEFORE connectDB
console.log("🧩 MONGO_URI:", process.env.MONGO_URI ? `✅ Present (length: ${process.env.MONGO_URI.length})` : "❌ Missing");
console.log("🧩 JWT_SECRET:", process.env.JWT_SECRET ? "✅ Present" : "❌ Missing");
console.log("🧩 PORT:", process.env.PORT || "Not set (will use default 5000)");

// Validate MONGO_URI before proceeding
if (!process.env.MONGO_URI) {
  console.error("❌ CRITICAL: MONGO_URI is not set! Cannot connect to database.");
  console.error("📁 Expected .env file at:", envPath);
}
// Initialize express app
const app = express();

// Middleware
app.use(cors({
  origin: [
    process.env.CLIENT_URL,
    "http://localhost:3000",
    "http://dereevesfoundations.com",
    "http://www.dereevesfoundations.com",
    "https://dereevesfoundations.com",
    "https://www.dereevesfoundations.com"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/password", passwordRoutes);

// Create HTTP server
const server = createServer(app);

// Enhanced Socket.IO with WebRTC signaling
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "https://dereevesfoundations.com",
      "https://www.dereevesfoundations.com"
    ],
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  transports: ["websocket", "polling"],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});


let onlineUsers = new Map(); // userId -> { socketId, lastSeen, isOnline }
let activeCalls = new Map(); // callId -> { caller, receiver, status }

io.on("connection", (socket) => {
  console.log("🔌 ========== NEW SOCKET CONNECTION ==========");
  console.log("🔌 Socket ID:", socket.id);
  console.log("🔌 Socket transport:", socket.conn.transport.name);
  console.log("🔌 Socket ready state:", socket.conn.readyState);
  console.log("🔌 Socket remote address:", socket.handshake.address);
  console.log("🔌 Socket headers:", socket.handshake.headers);
  console.log("🔌 ===========================================");

  // ✅ Support both registration methods
  socket.on("registerUser", (userId) => {
    onlineUsers.set(userId, {
      socketId: socket.id,
      lastSeen: new Date(),
      isOnline: true,
      role: 'user'
    });
    console.log("✅ Registered user (OLD):", userId, "- Online users:", onlineUsers.size);
    
    // ✅ NEW: Send current online users to the newly connected user
    const currentOnlineUsers = Array.from(onlineUsers.keys());
    socket.emit("online-users-list", currentOnlineUsers);
    console.log("📋 Sent online users list to", userId, ":", currentOnlineUsers);
    
    // ✅ NEW: Send status updates for all currently online users to the new user
    currentOnlineUsers.forEach(onlineUserId => {
      if (onlineUserId !== userId) {
        const userData = onlineUsers.get(onlineUserId);
        socket.emit("userOnlineStatus", {
          userId: onlineUserId,
          isOnline: true,
          lastSeen: userData.lastSeen
        });
        console.log("📡 Sent existing user status to new user:", onlineUserId, "->", userId);
      }
    });
    
    // Broadcast online status to all OTHER users (not the new user)
    socket.broadcast.emit("userOnlineStatus", {
      userId,
      isOnline: true,
      lastSeen: new Date()
    });
    console.log("📡 Broadcasted new user status to all other users:", userId);
  });

  socket.on("register", ({ userId, role }) => {
    console.log("📡 ========== USER REGISTRATION ==========");
    console.log("📡 User ID:", userId);
    console.log("📡 Role:", role);
    console.log("📡 Socket ID:", socket.id);
    console.log("📡 Current online users:", Array.from(onlineUsers.keys()));
    
    onlineUsers.set(userId, {
      socketId: socket.id,
      lastSeen: new Date(),
      isOnline: true,
      role
    });
    console.log("✅ Registered user (NEW):", userId, role, "- Online users:", onlineUsers.size);
    console.log("📡 Updated online users:", Array.from(onlineUsers.keys()));
    
    // ✅ NEW: Send current online users to the newly connected user
    const currentOnlineUsers = Array.from(onlineUsers.keys());
    socket.emit("online-users-list", currentOnlineUsers);
    console.log("📋 Sent online users list to", userId, ":", currentOnlineUsers);
    
    // ✅ NEW: Send status updates for all currently online users to the new user
    currentOnlineUsers.forEach(onlineUserId => {
      if (onlineUserId !== userId) {
        const userData = onlineUsers.get(onlineUserId);
        socket.emit("userOnlineStatus", {
          userId: onlineUserId,
          isOnline: true,
          lastSeen: userData.lastSeen
        });
        console.log("📡 Sent existing user status to new user:", onlineUserId, "->", userId);
      }
    });
    
    // Broadcast online status to all OTHER users (not the new user)
    socket.broadcast.emit("userOnlineStatus", {
      userId,
      isOnline: true,
      lastSeen: new Date()
    });
    console.log("📡 Broadcasted new user status to all other users:", userId);
  });

  // ✅ NEW: Handle get-online-users request
  socket.on("get-online-users", () => {
    const currentOnlineUsers = Array.from(onlineUsers.keys());
    socket.emit("online-users-list", currentOnlineUsers);
    console.log("📋 Sent online users list to requesting socket:", currentOnlineUsers);
  });

  // Handle sending messages
  socket.on("sendMessage", (message) => {
    console.log("💬 Message received from:", message.sender);
    const receiverData = onlineUsers.get(message.receiver);
    if (receiverData && receiverData.socketId) {
      io.to(receiverData.socketId).emit("receiveMessage", message);
    }
  });

  // ==================== WebRTC SIGNALING ====================

  // Initiate call
  socket.on("callUser", ({ userToCall, from, name, signal, callType }) => {
    console.log("📞 ========== CALL INITIATED ==========");
    console.log(`📞 From: ${from} (${name})`);
    console.log(`📞 To: ${userToCall}`);
    console.log(`📞 Type: ${callType}`);
    console.log(`📞 Signal: ${signal ? "Present" : "Missing"}`);
    console.log(`📞 Current online users:`, Array.from(onlineUsers.keys()));
    
    const receiverData = onlineUsers.get(userToCall);
    console.log(`📞 Receiver data:`, receiverData);
    
    if (receiverData && receiverData.socketId && receiverData.isOnline) {
      const callId = `${from}-${userToCall}-${Date.now()}`;
      activeCalls.set(callId, {
        caller: from,
        receiver: userToCall,
        status: "ringing",
        callType,
        startTime: Date.now()
      });

      console.log(`✅ Forwarding call to socket: ${receiverData.socketId}`);
      console.log(`📞 Call data being sent:`, {
        signal: signal ? "Present" : "Missing",
        from,
        name,
        callType,
        callId
      });
      
      io.to(receiverData.socketId).emit("incomingCall", {
        signal,
        from,
        name,
        callType,
        callId
      });
      console.log("✅ Call forwarded successfully");

      // ✅ NEW: Set call timeout (30 seconds)
      setTimeout(() => {
        const call = activeCalls.get(callId);
        if (call && call.status === "ringing") {
          console.log(`⏰ Call ${callId} timed out`);
          activeCalls.delete(callId);
          
          // Notify caller about timeout
          const callerData = onlineUsers.get(from);
          if (callerData && callerData.socketId) {
            io.to(callerData.socketId).emit("callTimeout", { callId });
          }
          
          // Notify receiver about timeout
          io.to(receiverData.socketId).emit("callTimeout", { callId });
        }
      }, 30000);

    } else {
      console.log("❌ Receiver not found or offline");
      console.log("❌ Receiver data:", receiverData);
      socket.emit("callError", { message: "User is offline" });
    }
    console.log("📞 ====================================");
  });

  // Answer call
  socket.on("answerCall", ({ signal, to, answer }) => {
    console.log("✅ ========== CALL ANSWERED ==========");
    console.log(`✅ Answering call to: ${to}`);
    console.log(`✅ Signal: ${signal ? "Present" : "Missing"}`);
    console.log(`✅ Answer: ${answer}`);
    
    const callerData = onlineUsers.get(to);
    
    if (callerData && callerData.socketId) {
      // Find and update call status
      for (let [callId, callData] of activeCalls.entries()) {
        if (callData.caller === to || callData.receiver === to) {
          callData.status = "connected";
          console.log(`✅ Call ${callId} status: connected`);
          break;
        }
      }
      
      console.log(`✅ Forwarding answer to socket: ${callerData.socketId}`);
      io.to(callerData.socketId).emit("callAccepted", { signal });
      console.log("✅ Answer forwarded successfully");
    } else {
      console.log("❌ Caller not found");
      console.log("❌ Available users:", Array.from(onlineUsers.keys()));
    }
    console.log("✅ ====================================");
  });

  // Reject call
  socket.on("rejectCall", ({ to }) => {
    console.log(`❌ Call rejected - notifying ${to}`);
    
    const callerData = onlineUsers.get(to);
    if (callerData && callerData.socketId) {
      io.to(callerData.socketId).emit("callRejected");
    }
  });

  // End call
  socket.on("endCall", ({ to, from }) => {
    console.log(`🔴 ========== END CALL REQUEST ==========`);
    console.log(`🔴 From socket: ${socket.id}`);
    console.log(`🔴 To user: ${to}`);
    console.log(`🔴 From user: ${from || 'not provided'}`);
    console.log(`🔴 Current online users:`, Array.from(onlineUsers.keys()));
    
    const otherUserData = onlineUsers.get(to);
    console.log(`🔴 Other user data:`, otherUserData);
    
    if (otherUserData && otherUserData.socketId) {
      console.log(`✅ Emitting callEnded to socket: ${otherUserData.socketId}`);
      io.to(otherUserData.socketId).emit("callEnded", { from: from || socket.id });
      console.log(`✅ callEnded emitted successfully`);
    } else {
      console.log(`❌ Could not find user ${to} in online users`);
      console.log(`❌ Available users:`, Array.from(onlineUsers.entries()).map(([id, data]) => ({ id, socketId: data.socketId })));
      
      // Fallback: broadcast to all sockets (less efficient but ensures delivery)
      console.log(`⚠️ Broadcasting callEnded to all connected sockets as fallback`);
      socket.broadcast.emit("callEnded", { to, from: from || socket.id });
    }

    // Remove from active calls
    for (let [callId, callData] of activeCalls.entries()) {
      if (callData.caller === to || callData.receiver === to) {
        activeCalls.delete(callId);
        console.log(`🔴 Removed call ${callId} from active calls`);
      }
    }
    console.log(`🔴 ====================================`);
  });

  // ICE candidate exchange
  socket.on("iceCandidate", ({ candidate, to }) => {
    const receiverData = onlineUsers.get(to);
    if (receiverData && receiverData.socketId) {
      io.to(receiverData.socketId).emit("iceCandidate", { candidate });
    }
  });

  // ==================== END WebRTC SIGNALING ====================

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
    
    // Find and mark user as offline
    for (let [userId, userData] of onlineUsers.entries()) {
      if (userData.socketId === socket.id) {
        const lastSeen = new Date();
        onlineUsers.set(userId, {
          ...userData,
          isOnline: false,
          lastSeen: lastSeen
        });
        
        console.log(`🔴 User ${userId} marked offline`);
        
        // Broadcast offline status
        io.emit("userOnlineStatus", {
          userId,
          isOnline: false,
          lastSeen: lastSeen
        });

        // End any active calls
        for (let [callId, callData] of activeCalls.entries()) {
          if (callData.caller === userId || callData.receiver === userId) {
            const otherUserId = callData.caller === userId ? callData.receiver : callData.caller;
            const otherUserData = onlineUsers.get(otherUserId);
            if (otherUserData && otherUserData.socketId) {
              io.to(otherUserData.socketId).emit("callEnded");
            }
            activeCalls.delete(callId);
            console.log(`🔴 Ended call ${callId} due to disconnect`);
          }
        }
        
        // Clean up after 5 minutes
        setTimeout(() => {
          onlineUsers.delete(userId);
          console.log(`🗑️ Cleaned up user ${userId} from memory`);
        }, 5 * 60 * 1000);
        
        break;
      }
    }
  });
});

// Connect to database before starting server
connectDB().then(() => {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log("=".repeat(60));
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🔌 Socket.IO server ready`);
    console.log(`🌐 Accepting connections from: http://localhost:3000`);
    console.log("=".repeat(60));
  });
}).catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});