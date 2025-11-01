//C:\Users\HP\dereeves\frontend\src\app\chat\page.js
"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import socket from "@/utils/socket";
import api from "@/utils/api";
import CallModal from "@/components/callmodal";
import IncomingCallModal from "@/components/incomingcallmodal";

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [incomingCall, setIncomingCall] = useState(null);
  const [showIncomingModal, setShowIncomingModal] = useState(false);


  useEffect(() => {
  const initChat = async () => {
    console.log("🚀 [USER] Starting chat initialization...");

    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      console.log("🧠 [USER] Stored user:", storedUser);

      if (!storedUser) {
        console.log("⛔ [USER] No user in localStorage. Redirecting to /login");
        router.push("/login");
        return;
      }

      const normalizedUser = {
        ...storedUser,
        _id: storedUser._id || storedUser.id,
        id: storedUser.id || storedUser._id
      };
      
      setUser(normalizedUser);
      console.log("✅ [USER] User set:", normalizedUser._id);

      // ✅ Register with socket using NEW method
      console.log("📡 [USER] Socket connected:", socket.connected);
      if (!socket.connected) {
        console.log("📡 [USER] Socket not connected, attempting to connect...");
        socket.connect();
        
        // Wait for connection and then register
        socket.once('connect', () => {
          console.log("📡 [USER] Socket connected after manual connect");
          socket.emit("register", { userId: normalizedUser._id, role: "user" });
        });
      }
      
      console.log("📡 [USER] Emitting register event");
      console.log("📡 [USER] User ID:", normalizedUser._id);
      console.log("📡 [USER] Socket connected:", socket.connected);
      console.log("📡 [USER] Socket ID:", socket.id);
      
      socket.emit("register", { userId: normalizedUser._id, role: "user" });
      console.log("✅ [USER] Registration emitted");

      console.log("📩 [USER] Fetching admin info...");
      let adminRes;
      try {
        adminRes = await api.get("/messages/admin/info");
        console.log("✅ [USER] Admin info fetched:", adminRes.data);
        setAdmin(adminRes.data);
      } catch (error) {
        console.error("❌ [USER] Error fetching admin info:", error);
        if (error.response?.status === 401) {
          console.log("🔑 [USER] Token expired, redirecting to login");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          router.push("/login");
          return;
        }
        throw error;
      }

      console.log("📩 [USER] Fetching messages...");
      try {
        const messagesRes = await api.get(`/messages/${adminRes.data._id}`);
        console.log("✅ [USER] Messages fetched:", messagesRes.data.length);
        setMessages(messagesRes.data);
        fetchUnreadCount();
      } catch (error) {
        console.error("❌ [USER] Error fetching messages:", error);
        if (error.response?.status === 401) {
          console.log("🔑 [USER] Token expired, redirecting to login");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          router.push("/login");
          return;
        }
      }

      setLoading(false);
      console.log("🎉 [USER] Chat page initialized successfully");
    } catch (error) {
      console.error("❌ [USER] Error initializing chat:", error);
      if (error.response?.status === 401) {
        router.push("/login");
      }
      setLoading(false);
    }
  };

  initChat();
}, [router]);

  // Handle socket reconnection
useEffect(() => {
  if (!user) return;

  const onConnect = () => {
    console.log("✅ [USER] Socket reconnected, ID:", socket.id);
    console.log("📡 [USER] Re-registering user:", user._id);
    socket.emit("register", { userId: user._id, role: "user" });
  };

  const onDisconnect = () => {
    console.log("🔌 [USER] Socket disconnected");
  };

  const onConnectError = (error) => {
    console.error("❌ [USER] Socket connection error:", error);
    console.log("🔄 [USER] Attempting to reconnect in 3 seconds...");
    setTimeout(() => {
      if (!socket.connected) {
        console.log("🔄 [USER] Manual reconnection attempt");
        socket.connect();
      }
    }, 3000);
  };

  socket.on('connect', onConnect);
  socket.on('disconnect', onDisconnect);
  socket.on('connect_error', onConnectError);

  // Register immediately if already connected
  if (socket.connected) {
    console.log("📡 [USER] Socket already connected, registering immediately");
    onConnect();
  }

  return () => {
    socket.off('connect', onConnect);
    socket.off('disconnect', onDisconnect);
    socket.off('connect_error', onConnectError);
  };
}, [user]);

  // ✅ State for tracking online users
  const [onlineUserIdsSet, setOnlineUserIdsSet] = useState(new Set());
  const [lastSeenData, setLastSeenData] = useState({});
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [callType, setCallType] = useState("audio");
  const [callDirection, setCallDirection] = useState("outgoing");

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get("/messages/unread/counts");
      const total = Object.values(res.data).reduce((sum, count) => sum + count, 0);
      setUnreadCount(total);
    } catch (error) {
      console.error("Error fetching unread count:", error);
      if (error.response?.status === 401) {
        console.log("🔑 Token expired, redirecting to login");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/login");
      }
    }
  };

  const fetchMessages = async (adminId) => {
    if (!adminId) return;
    try {
      const res = await api.get(`/messages/${adminId}`);
      setMessages(res.data);
      setUnreadCount(0);
    } catch (error) {
      console.error("Error fetching messages:", error);
      if (error.response?.status === 401) {
        console.log("🔑 Token expired, redirecting to login");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/login");
      }
    }
  };

  // ----------------------------------------------------------------
  // 🎯 REQUEST ONLINE USERS LIST AFTER USER IS SET
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!user) return;

    // Request current online users from server
    console.log("📡 [USER] Requesting online users list");
    socket.emit("get-online-users");

    const handleOnlineUsersList = (ids) => {
      console.log("📋 [USER] Online users list received:", ids);
      setOnlineUserIdsSet(new Set(ids));
    };

    socket.on("online-users-list", handleOnlineUsersList);
    return () => socket.off("online-users-list", handleOnlineUsersList);
  }, [user]);

  // ----------------------------------------------------------------
  // 🎯 UNIFIED SOCKET STATUS HANDLERS
  // ----------------------------------------------------------------
  useEffect(() => {
    const handleUserOnlineStatus = ({ userId, isOnline, lastSeen }) => {
      console.log("📡 [USER] Status update:", userId, isOnline ? "online" : "offline");

      // Update online users set
      setOnlineUserIdsSet((prev) => {
        const newSet = new Set(prev);
        if (isOnline) newSet.add(userId);
        else newSet.delete(userId);
        console.log("📊 [USER] Online users after update:", Array.from(newSet));
        return newSet;
      });

      // Update lastSeen info when offline
      if (!isOnline && lastSeen) {
        setLastSeenData((prev) => ({
          ...prev,
          [userId]: lastSeen,
        }));
      }
    };

    socket.on("userOnlineStatus", handleUserOnlineStatus);

    return () => {
      socket.off("userOnlineStatus", handleUserOnlineStatus);
    };
  }, []);


  // ----------------------------------------------------------------
  // 🎯 POLLING for messages and unread count
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!admin) return;

    const interval = setInterval(() => {
      fetchMessages(admin._id);
    }, 2000);

    return () => clearInterval(interval);
  }, [admin]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // ----------------------------------------------------------------
  // 🎯 INCOMING CALL HANDLER
  // ----------------------------------------------------------------
  useEffect(() => {
  const handleIncomingCall = (data) => {
    console.log("📞 ========== INCOMING CALL RECEIVED ==========");
    console.log("📞 Raw data received:", data);
    
    const { signal, from, name, callType, callId } = data;
    console.log("📞 Signal:", signal ? "Present" : "Missing");
    console.log("📞 From:", from);
    console.log("📞 Name:", name);
    console.log("📞 Call Type:", callType);
    console.log("📞 Call ID:", callId);
    console.log("📞 Current user:", user?._id);
    console.log("📞 Admin:", admin?._id);

    // Find admin info
    const callerInfo = admin
      ? { name: admin.name, email: admin.email, _id: admin._id }
      : { name: name || "Admin", email: "", _id: from };

    console.log("📞 Caller info:", callerInfo);

    // Store the call signal and show the modal
    const callData = { signal, from, name, callType, callId, caller: callerInfo };
    console.log("📞 Setting incoming call data:", callData);
    
    // Force state update
    setIncomingCall(callData);
    setShowIncomingModal(true);
    
    console.log("📞 Incoming call modal should be showing now");
    console.log("📞 showIncomingModal:", true);
    console.log("📞 incomingCall:", callData);
    console.log("📞 ==========================================");
    
    // Force a re-render by updating state again
    setTimeout(() => {
      console.log("📞 Checking state after timeout:");
      console.log("📞 showIncomingModal:", showIncomingModal);
      console.log("📞 incomingCall:", incomingCall);
      
      // If modal still not showing, force it
      if (!showIncomingModal) {
        console.log("📞 Forcing modal to show");
        setShowIncomingModal(true);
      }
    }, 100);
  };

  console.log("👂 Setting up incoming call listener");
  console.log("👂 Socket connected:", socket.connected);
  console.log("👂 Socket ID:", socket.id);
  
  // Add debugging for all socket events
  const debugHandler = (eventName, ...args) => {
    console.log(`🔔 [USER] Socket event received: "${eventName}"`, args);
  };
  socket.onAny(debugHandler);
  
  socket.on("incomingCall", handleIncomingCall);
  return () => {
    console.log("🧹 Cleaning up incoming call listener");
    socket.offAny(debugHandler);
    socket.off("incomingCall", handleIncomingCall);
  };
}, [admin, user]);


  // ----------------------------------------------------------------
  // 🎯 RECEIVE MESSAGE HANDLER
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!user || !admin) return;

    const handleReceiveMessage = (messageData) => {
      fetchUnreadCount();
      
      if (messageData.sender === admin._id && messageData.receiver === user._id) {
        setMessages((prev) => {
          const exists = prev.some(m => 
            m._id === messageData._id ||
            (m.sender === messageData.sender && 
             m.receiver === messageData.receiver && 
             m.content === messageData.content &&
             Math.abs(new Date(m.createdAt) - new Date(messageData.createdAt)) < 1000)
          );
          return exists ? prev : [...prev, messageData];
        });
        
        setTimeout(() => {
          fetchMessages(admin._id);
        }, 500);
      }
    };

    socket.on("receiveMessage", handleReceiveMessage);
    return () => socket.off("receiveMessage", handleReceiveMessage);
  }, [user, admin]);

  // ----------------------------------------------------------------
  // 🎯 MESSAGE SENDING
  // ----------------------------------------------------------------
  const sendMessage = async () => {
    if (!input.trim() || !user || !admin) return;

    const messageData = {
      sender: user._id,
      receiver: admin._id,
      content: input.trim(),
    };

    try {
      const response = await api.post("/messages", messageData);
      setMessages((prev) => [...prev, response.data]);
      socket.emit("sendMessage", response.data);
      setInput("");
    } catch (error) {
      console.error("❌ Error:", error);
      alert(`Failed to send message: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ----------------------------------------------------------------
  // 🎯 CALL FUNCTIONS
  // ----------------------------------------------------------------
  const startCall = (type) => {
    console.log("📞 ========== USER STARTING CALL ==========");
    console.log("📞 Admin data:", admin);
    console.log("📞 Admin ID:", admin?._id);
    console.log("📞 Online users set:", Array.from(onlineUserIdsSet));
    console.log("📞 Is admin online:", admin && onlineUserIdsSet.has(admin._id));
    
    const isAdminOnline = admin && onlineUserIdsSet.has(admin._id);
    
    if (!isAdminOnline) {
      console.log("❌ Admin is offline - cannot start call");
      alert("Admin is currently offline. Please try again later.");
      return;
    }
    
    console.log("✅ Admin is online - starting call");
    console.log("📞 Starting call to admin - type:", type);
    setCallType(type); // Store the call type (audio or video)
    setCallDirection("outgoing"); // Set call direction
    setIsCallModalOpen(true);
  };

  const closeCall = () => {
    console.log("📴 Closing call modal");
    setIsCallModalOpen(false);
    setCallType("audio"); // Reset to default
    setCallDirection("outgoing"); // Reset to default
    window.incomingCallSignal = null;
    window.incomingCallFrom = null;
  };

  const handleAcceptCall = () => {
  if (!incomingCall) return;
  console.log("✅ Accepting call from:", incomingCall.from);
  console.log("✅ Incoming call signal:", incomingCall.signal);

  // Store the signal and open the CallModal - it will emit the answerCall with signal
  setShowIncomingModal(false);
  setCallType(incomingCall.callType || "audio"); // Use the call type from the incoming call
  setCallDirection("incoming"); // Set call direction to incoming
  setIsCallModalOpen(true);

  // Store the incoming signal for the CallModal to use
  window.incomingCallSignal = incomingCall.signal;
  window.incomingCallFrom = incomingCall.from;
};

const handleRejectCall = () => {
  if (!incomingCall) return;
  console.log("❌ Rejecting call from:", incomingCall.from);

  // Only emit rejectCall if this is a real call (not test)
  if (incomingCall.from !== "test-admin") {
    socket.emit("rejectCall", { to: incomingCall.from });
  }
  
  setShowIncomingModal(false);
  setIncomingCall(null);
};


  // ----------------------------------------------------------------
  // 🎯 HELPER: Get last seen text
  // ----------------------------------------------------------------
  const getLastSeenText = (lastSeenDate) => {
    if (!lastSeenDate) return "recently";
    const now = new Date();
    const lastSeenTime = new Date(lastSeenDate);
    const diffMins = Math.floor((now - lastSeenTime) / 60000);
    const diffHours = Math.floor((now - lastSeenTime) / 3600000);
    
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return lastSeenTime.toLocaleString();
  };

  // ----------------------------------------------------------------
  // 🎯 LOADING STATES
  // ----------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-black">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-black">Admin not available. Please try again later.</p>
        </div>
      </div>
    );
  }

  // Check if admin is online
  const isAdminOnline = onlineUserIdsSet.has(admin._id);
  const adminLastSeen = lastSeenData[admin._id];
  
  // Debug modal state
  console.log("🔍 [DEBUG] Modal state:", {
    showIncomingModal,
    incomingCall: incomingCall ? "Present" : "Missing",
    isCallModalOpen,
    callType
  });

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Incoming Call Modal */}
      {showIncomingModal && incomingCall && (
        <IncomingCallModal
          caller={{
            name: incomingCall.name || "Admin",
            email: incomingCall.email || "admin@example.com"
          }}
          callType={incomingCall.callType || "audio"}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}
      

      {/* Active Call Modal */}
      {isCallModalOpen && (
        <CallModal
          isOpen={isCallModalOpen}
          onClose={closeCall}
          callType={callType}
          otherUser={admin}
          currentUser={user}
          isInitiator={callDirection === "outgoing"}
          incomingSignal={window.incomingCallSignal}
        />
      )}

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white p-4 shadow-lg z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {admin.name.charAt(0).toUpperCase()}
                </div>
                <div 
                  className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-blue-600 ${
                    isAdminOnline ? "bg-green-500" : "bg-gray-400"
                  }`}
                />
              </div>
              
              <div className="flex-1">
                <h1 className="text-xl font-bold">Chat with dannyyyy</h1>
                <p className="text-sm opacity-90">
                  {isAdminOnline ? (
                    <span className="text-green-300">● Online</span>
                  ) : (
                    <span>Last seen {getLastSeenText(adminLastSeen)}</span>
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Debug Info */}
              {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-white/70">
                  Admin: {admin?.name || 'Loading...'} | 
                  Online: {isAdminOnline ? 'Yes' : 'No'} | 
                  ID: {admin?._id || 'N/A'}
                </div>
              )}
              
              {/* Call Buttons */}
              <button
                onClick={() => startCall("audio")}
                disabled={!isAdminOnline}
                className={`p-3 rounded-lg transition-colors ${
                  isAdminOnline
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
                title="Voice Call"
              >
                📞
              </button>
              <button
                onClick={() => startCall("video")}
                disabled={!isAdminOnline}
                className={`p-3 rounded-lg transition-colors ${
                  isAdminOnline
                    ? "bg-white/20 hover:bg-white/30"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
                title="Video Call"
              >
                📹
              </button>

              {unreadCount > 0 && (
                <div className="bg-red-500 text-white text-sm font-bold rounded-full h-8 w-8 flex items-center justify-center">
                  {unreadCount}
                </div>
              )}
              
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to logout?")) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    socket.disconnect();
                    window.location.href = "/login";
                  }
                }}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 pt-28 pb-28">
        <div className="max-w-4xl mx-auto space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-black mt-10">
              <div className="text-5xl mb-4">👋</div>
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => {
                const msgSenderId = typeof msg.sender === 'object' ? msg.sender._id : msg.sender;
                const userId = user._id;
                const isCurrentUser = msgSenderId === userId;
                
                return (
                  <div
                    key={msg._id || idx}
                    className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg shadow ${
                        isCurrentUser
                          ? "bg-blue-600 text-white"
                          : "bg-white text-black"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold opacity-75">
                          {isCurrentUser ? "You" : "Admin"}
                        </span>
                      </div>
                      <p className="break-words">{msg.content}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className={`text-xs ${isCurrentUser ? "text-blue-100" : "text-gray-500"}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        {isCurrentUser && (
                          <span className="text-xs text-blue-100">
                            {msg.read ? "✓✓" : "✓"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-10">
        <div className="max-w-4xl mx-auto flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 text-black"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}