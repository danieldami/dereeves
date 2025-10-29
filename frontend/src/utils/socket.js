//C:\Users\HP\dereeves\frontend\src\utils\socket.js
import { io } from "socket.io-client";

// Use environment variable if deployed, else fallback to localhost
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

// Initialize socket connection
const socket = io(SOCKET_URL, {
  transports: ["polling", "websocket"], // Try polling first, then websocket
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 10,
  timeout: 20000,
  withCredentials: true,
  autoConnect: true,
  forceNew: true,
  upgrade: true,
  rememberUpgrade: false
});

// Debug logs
socket.on("connect", () => {
  console.log("✅ Socket connected:", socket.id);
  console.log("✅ Socket URL:", SOCKET_URL);
  console.log("✅ Socket transport:", socket.io.engine.transport.name);
});

socket.on("disconnect", (reason) => {
  console.log("🔌 Socket disconnected:", reason);
  console.log("🔌 Socket connected:", socket.connected);
});

socket.on("connect_error", (err) => {
  console.error("❌ Socket error:", err.message);
  console.error("❌ Socket error details:", err);
  console.error("❌ Socket URL:", SOCKET_URL);
  console.error("❌ Error type:", err.type);
  console.error("❌ Error description:", err.description);
});

socket.on("userOnlineStatus", ({ userId, isOnline, lastSeen }) => {
  console.log("👤 User status update:", userId, isOnline ? "online" : "offline", "Last seen:", lastSeen);
});

// Log initial connection state
console.log("🔌 Socket initial state:", {
  connected: socket.connected,
  url: SOCKET_URL,
  id: socket.id
});

export default socket;
