//C:\Users\HP\dereeves\frontend\src\app\chat\page.js
"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import socket from "@/utils/socket";
import api from "@/utils/api";
import CallModal from "@/components/callmodal";
import IncomingCallModal from "@/components/incomingcallmodal";

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [incomingCall, setIncomingCall] = useState(null);
  const [showIncomingModal, setShowIncomingModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);


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

      // Get adminId from query params
      const adminId = searchParams.get("adminId");
      console.log("🔍 [USER] Admin ID from query:", adminId);

      console.log("📩 [USER] Fetching admin info...");
      let selectedAdmin;
      try {
        const adminsRes = await api.get("/messages/admin/info");
        console.log("✅ [USER] Admins fetched:", adminsRes.data);
        
        // If adminId is provided, find that specific admin, otherwise use the first one
        if (adminId) {
          selectedAdmin = adminsRes.data.find(admin => admin._id === adminId);
          if (!selectedAdmin) {
            console.warn("⚠️ [USER] Specified admin not found, using first admin");
            selectedAdmin = adminsRes.data[0];
          }
        } else {
          selectedAdmin = adminsRes.data[0];
        }
        
        console.log("✅ [USER] Selected admin:", selectedAdmin);
        setAdmin(selectedAdmin);
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
        const messagesRes = await api.get(`/messages/${selectedAdmin._id}`);
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
}, [router, searchParams]);

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
  const messagesContainerRef = useRef(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const userScrolledRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Check if user is near the bottom of the chat
  const isNearBottom = () => {
    if (!messagesContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const threshold = 150; // pixels from bottom
    return scrollHeight - scrollTop - clientHeight < threshold;
  };

  // Handle scroll events to detect manual scrolling
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const nearBottom = isNearBottom();
      setShouldAutoScroll(nearBottom);
      if (!nearBottom) {
        userScrolledRef.current = true;
      }
    }
  };

  // Auto-scroll only if user is near bottom or hasn't manually scrolled up
  useEffect(() => {
    if (shouldAutoScroll) {
      scrollToBottom();
    }
  }, [messages, shouldAutoScroll]);

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

  // Global handler for callEnded - ensures it's always received even if CallModal unmounts
  const handleCallEndedGlobal = (data) => {
    console.log("🔴 [USER] Global callEnded received:", data);
    
    // If call modal is open, it will handle this
    // This is just a safety net to ensure modal closes if it's stuck
    if (isCallModalOpen) {
      console.log("🔴 [USER] Closing call modal due to callEnded event");
      setIsCallModalOpen(false);
    }
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
  socket.on("callEnded", handleCallEndedGlobal);
  
  return () => {
    console.log("🧹 Cleaning up incoming call listener");
    socket.offAny(debugHandler);
    socket.off("incomingCall", handleIncomingCall);
    socket.off("callEnded", handleCallEndedGlobal);
  };
}, [admin, user, isCallModalOpen]);


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
    if ((!input.trim() && !selectedFile) || !user || !admin) return;

    try {
      const formData = new FormData();
      formData.append('sender', user._id);
      formData.append('receiver', admin._id);
      
      if (input.trim()) {
        formData.append('content', input.trim());
      }
      
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const response = await api.post("/messages", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setMessages((prev) => [...prev, response.data]);
      socket.emit("sendMessage", response.data);
      setInput("");
      setSelectedFile(null);
      setFilePreview(null);
    } catch (error) {
      console.error("❌ Error:", error);
      alert(`Failed to send message: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }

      setSelectedFile(file);

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
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
              {/* Back Arrow */}
              <button
                onClick={() => router.push("/dashboard")}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Back to Dashboard"
              >
                <svg 
                  className="w-6 h-6" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

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
                <h1 className="text-xl font-bold flex items-center gap-1">
                  Keanu Charles Reeves
                  <svg 
                    className="w-6 h-6 inline-block flex-shrink-0" 
                    viewBox="0 0 40 40" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                    title="Verified"
                  >
                    {/* Instagram-style verified badge */}
                    <circle cx="20" cy="20" r="18" fill="#1DA1F2" />
                    <path 
                      d="M16 20l3 3 6-6" 
                      stroke="white" 
                      strokeWidth="3" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                </h1>
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
              {unreadCount > 0 && (
                <div className="bg-red-500 text-white text-sm font-bold rounded-full h-8 w-8 flex items-center justify-center">
                  {unreadCount}
                </div>
              )}
              
              {/* Audio Call Button */}
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
            </div>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 pt-28 pb-28"
      >
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
                      
                      {/* File Attachment */}
                      {msg.fileUrl && (
                        <div className="mb-2">
                          {msg.fileType?.startsWith('image/') ? (
                            <a href={`${process.env.NEXT_PUBLIC_API_URL || 'https://dereevesfoundations.com'}${msg.fileUrl}`} target="_blank" rel="noopener noreferrer">
                              <img 
                                src={`${process.env.NEXT_PUBLIC_API_URL || 'https://dereevesfoundations.com'}${msg.fileUrl}`}
                                alt={msg.fileName}
                                className="max-w-full rounded cursor-pointer hover:opacity-90 transition-opacity"
                                style={{ maxHeight: '200px' }}
                              />
                            </a>
                          ) : (
                            <a 
                              href={`${process.env.NEXT_PUBLIC_API_URL || 'https://dereevesfoundations.com'}${msg.fileUrl}`}
                              download={msg.fileName}
                              className={`flex items-center gap-2 p-2 rounded ${isCurrentUser ? 'bg-blue-500' : 'bg-gray-100'} hover:opacity-90 transition-opacity`}
                            >
                              <span className="text-2xl">📄</span>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate ${isCurrentUser ? 'text-white' : 'text-gray-900'}`}>
                                  {msg.fileName}
                                </p>
                                <p className={`text-xs ${isCurrentUser ? 'text-blue-100' : 'text-gray-500'}`}>
                                  {msg.fileSize ? `${(msg.fileSize / 1024).toFixed(1)} KB` : 'Download'}
                                </p>
                              </div>
                            </a>
                          )}
                        </div>
                      )}
                      
                      {/* Message Text */}
                      {msg.content && <p className="break-words">{msg.content}</p>}
                      
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
        <div className="max-w-4xl mx-auto">
          {/* File Preview */}
          {selectedFile && (
            <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {filePreview ? (
                    <img src={filePreview} alt="Preview" className="w-16 h-16 object-cover rounded" />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                      <span className="text-2xl">📄</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  onClick={removeFile}
                  className="ml-3 text-red-600 hover:text-red-700 font-medium text-sm"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Input Row */}
          <div className="flex gap-2">
            {/* File Upload Button */}
            <label className="cursor-pointer">
              <input
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,application/pdf,.doc,.docx,.txt,.zip"
              />
              <div className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg transition-colors flex items-center justify-center">
                <span className="text-xl">📎</span>
              </div>
            </label>

            {/* Text Input */}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 text-black"
            />

            {/* Send Button */}
            <button
              onClick={sendMessage}
              disabled={!input.trim() && !selectedFile}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-xl text-gray-600">Loading chat...</p></div>}>
      <ChatPageContent />
    </Suspense>
  );
}