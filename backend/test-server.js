// Simple test to check if server can start
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
}));
app.use(express.json());

// Simple test route
app.get("/test", (req, res) => {
  res.json({ message: "Backend server is running!", timestamp: new Date() });
});

const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  transports: ["websocket", "polling"],
});

io.on("connection", (socket) => {
  console.log("✅ Test client connected:", socket.id);
  
  socket.on("test", (data) => {
    console.log("📨 Test message received:", data);
    socket.emit("test-response", { message: "Test successful!", data });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log("=".repeat(60));
  console.log(`✅ Test server running on port ${PORT}`);
  console.log(`🔌 Socket.IO server ready`);
  console.log(`🌐 Test endpoint: http://localhost:${PORT}/test`);
  console.log("=".repeat(60));
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down test server...');
  server.close(() => {
    console.log('✅ Test server closed');
    process.exit(0);
  });
});

