// Socket service for managing real-time connections
class SocketService {
  constructor() {
    this.onlineUsers = new Map(); // userId -> { socketId, lastSeen, isOnline, role }
    this.activeCalls = new Map(); // callId -> { caller, receiver, status, callType }
  }

  // Register a user with the socket
  registerUser(socket, { userId, role }) {
    this.onlineUsers.set(userId, {
      socketId: socket.id,
      lastSeen: new Date(),
      isOnline: true,
      role
    });
    
    console.log(`✅ User registered: ${userId} (${role}) - Socket: ${socket.id}`);
    console.log(`📊 Total online users: ${this.onlineUsers.size}`);
    
    return this.onlineUsers.get(userId);
  }

  // Handle user disconnection
  handleDisconnect(socket) {
    for (let [userId, userData] of this.onlineUsers.entries()) {
      if (userData.socketId === socket.id) {
        const lastSeen = new Date();
        this.onlineUsers.set(userId, {
          ...userData,
          isOnline: false,
          lastSeen: lastSeen
        });
        
        console.log(`🔴 User ${userId} marked offline`);
        
        // Clean up after 5 minutes
        setTimeout(() => {
          this.onlineUsers.delete(userId);
          console.log(`🗑️ Cleaned up user ${userId} from memory`);
        }, 5 * 60 * 1000);
        
        return { userId, lastSeen };
      }
    }
    return null;
  }

  // Get online users list
  getOnlineUsers() {
    return Array.from(this.onlineUsers.keys());
  }

  // Check if user is online
  isUserOnline(userId) {
    const userData = this.onlineUsers.get(userId);
    return userData && userData.isOnline;
  }

  // Get user data
  getUserData(userId) {
    return this.onlineUsers.get(userId);
  }

  // Handle call initiation
  initiateCall(callerId, receiverId, callType) {
    const receiverData = this.onlineUsers.get(receiverId);
    
    if (!receiverData || !receiverData.isOnline) {
      return { success: false, error: "User is offline" };
    }

    const callId = `${callerId}-${receiverId}-${Date.now()}`;
    this.activeCalls.set(callId, {
      caller: callerId,
      receiver: receiverId,
      status: "ringing",
      callType
    });

    return { success: true, callId, receiverSocketId: receiverData.socketId };
  }

  // Handle call answer
  answerCall(callId, answererId) {
    const callData = this.activeCalls.get(callId);
    if (!callData) {
      return { success: false, error: "Call not found" };
    }

    callData.status = "connected";
    return { success: true, callerId: callData.caller };
  }

  // End call
  endCall(callId) {
    const callData = this.activeCalls.get(callId);
    if (callData) {
      this.activeCalls.delete(callId);
      return { success: true, otherUserId: callData.caller === callId ? callData.receiver : callData.caller };
    }
    return { success: false, error: "Call not found" };
  }

  // Get active calls
  getActiveCalls() {
    return Array.from(this.activeCalls.entries());
  }
}

export default SocketService;

