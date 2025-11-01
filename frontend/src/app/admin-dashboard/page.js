//C:\Users\HP\dereeves\frontend\src\app\admin-dashboard\page.js
"use client";
import { useEffect, useState, useRef } from "react";
import api from "@/utils/api";
import socket from "@/utils/socket";
import CallModal from "@/components/callmodal";

export default function AdminDashboard() {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMsg, setNewMsg] = useState("");
    const [admin, setAdmin] = useState(null);
    const [loading, setLoading] = useState(false);
    const [unreadCounts, setUnreadCounts] = useState({});

    // ✅ Use Set for tracking online users (same as user chat)
    const [onlineUserIdsSet, setOnlineUserIdsSet] = useState(new Set());
    const [lastSeenData, setLastSeenData] = useState({});
    
    const [isCallModalOpen, setIsCallModalOpen] = useState(false);
    const [callType, setCallType] = useState("outgoing");
    const [callTargetUser, setCallTargetUser] = useState(null);

    const messagesEndRef = useRef(null);
    const pollingIntervalRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchUnreadCounts = async () => {
        try {
            const res = await api.get("/messages/unread/counts");
            setUnreadCounts(res.data);
        } catch (error) {
            console.error("Error fetching unread counts:", error);
        }
    };

    const fetchMessages = async (userId) => {
        if (!userId) return;
        try {
            const res = await api.get(`/messages/${userId}`);
            setMessages(res.data);
        } catch (error) {
            console.error("Error fetching messages:", error);
        }
    };

    const getLastSeenText = (lastSeenDate) => {
        if (!lastSeenDate) return "recently";
        const now = new Date();
        const lastSeenTime = new Date(lastSeenDate);
        const diffMs = now - lastSeenTime;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return "just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return "yesterday";
        if (diffDays < 7) return `${diffDays}d ago`;
        return lastSeenTime.toLocaleDateString();
    };

    // ----------------------------------------------------------------
    // 🎯 INITIAL SETUP: Admin login and fetch users
    // ----------------------------------------------------------------
    useEffect(() => {
        const initAdmin = async () => {
            console.log("🚀 [ADMIN] Starting initialization...");
            
            const stored = JSON.parse(localStorage.getItem("user"));
            
            if (!stored) {
                window.location.href = "/login";
                return;
            }

            const normalizedAdmin = {
                ...stored,
                _id: stored._id || stored.id,
                id: stored.id || stored._id
            };
            
            if (normalizedAdmin.role !== "admin") {
                alert("Access denied. Admin only.");
                window.location.href = "/chat";
                return;
            }
            
            setAdmin(normalizedAdmin);
            console.log("✅ [ADMIN] Admin set:", normalizedAdmin._id);
            
            // ✅ Register admin with socket
            console.log("📡 [ADMIN] Socket connected:", socket.connected);
            console.log("📡 [ADMIN] Socket ID:", socket.id);
            
            if (!socket.connected) {
                console.log("📡 [ADMIN] Connecting socket...");
                socket.connect();
            }
            
            console.log("📡 [ADMIN] Emitting register event with:", { userId: normalizedAdmin._id, role: "admin" });
            socket.emit("register", { userId: normalizedAdmin._id, role: "admin" });
            console.log("✅ [ADMIN] Registration emitted");
            
            try {
                const res = await api.get("/users");
                const nonAdminUsers = res.data.filter(u => u.role !== "admin");
                setUsers(nonAdminUsers);
                console.log("✅ [ADMIN] Fetched users:", nonAdminUsers.map(u => ({ id: u._id, name: u.name })));
            } catch (err) {
                const status = err?.response?.status;
                const data = err?.response?.data;
                console.error("❌ [ADMIN] Error fetching users | status:", status, "| data:", data, "| err:", err);
                if (status === 401) {
                    alert("Session expired or invalid. Please log in again.");
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    window.location.href = "/login";
                    return;
                }
                if (status === 403) {
                    alert("Access denied. Admin only.");
                    window.location.href = "/chat";
                    return;
                }
                alert(data?.message || "Failed to fetch users");
            }

            fetchUnreadCounts();
        };

        initAdmin();

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, []);

    // ----------------------------------------------------------------
    // 🎯 SOCKET RECONNECTION HANDLER
    // ----------------------------------------------------------------
   // ----------------------------------------------------------------
// 🎯 FIXED: Register admin + request current online users
// ----------------------------------------------------------------
useEffect(() => {
  if (!admin) return;

  // Register admin again (ensures backend knows this client)
  socket.emit("register", { userId: admin._id, role: "admin" });
  console.log("📡 [ADMIN] Re-emitted register after admin set:", admin._id);

  // ✅ Request currently online users
  socket.emit("get-online-users");

  // ✅ Listen for the response
  const handleOnlineUsersList = (ids) => {
    console.log("📋 [ADMIN] Online users list received:", ids);
    setOnlineUserIdsSet(new Set(ids));
  };

  socket.on("online-users-list", handleOnlineUsersList);

  return () => {
    socket.off("online-users-list", handleOnlineUsersList);
  };
}, [admin]);


    // ----------------------------------------------------------------
    // 🎯 UNIFIED SOCKET STATUS HANDLER WITH FULL DEBUG LOGS
    // ----------------------------------------------------------------
    useEffect(() => {
        console.log("🔍 [ADMIN DEBUG] Setting up ALL socket listeners...");
        console.log("🔍 [ADMIN DEBUG] Current admin:", admin?._id);
        console.log("🔍 [ADMIN DEBUG] Current onlineUserIdsSet:", Array.from(onlineUserIdsSet));
        
        // Listen to ALL socket events for debugging
        const anyEventHandler = (eventName, ...args) => {
            console.log(`🔔 [ADMIN] Socket event received: "${eventName}"`, args);
        };
        
        socket.onAny(anyEventHandler);

        const handleUserOnlineStatus = ({ userId, isOnline, lastSeen }) => {
            console.log("📡 [ADMIN] ===== userOnlineStatus event =====");
            console.log("📡 [ADMIN] userId:", userId);
            console.log("📡 [ADMIN] isOnline:", isOnline);
            console.log("📡 [ADMIN] lastSeen:", lastSeen);
            console.log("📡 [ADMIN] Current onlineSet BEFORE update:", Array.from(onlineUserIdsSet));

            // ✅ Update online users set
            setOnlineUserIdsSet((prev) => {
                const newSet = new Set(prev);
                if (isOnline) {
                    newSet.add(userId);
                    console.log(`✅ [ADMIN] Added ${userId} to online set`);
                } else {
                    newSet.delete(userId);
                    console.log(`❌ [ADMIN] Removed ${userId} from online set`);
                }
                console.log(`📊 [ADMIN] Online users AFTER update:`, Array.from(newSet));
                return newSet;
            });

            // ✅ Update lastSeen info when offline
            if (!isOnline && lastSeen) {
                setLastSeenData((prev) => {
                    const updated = {
                        ...prev,
                        [userId]: lastSeen,
                    };
                    console.log(`🕒 [ADMIN] Updated lastSeenData:`, updated);
                    return updated;
                });
            }
            console.log("📡 [ADMIN] ===== End userOnlineStatus event =====");
        };

        const handleOnlineUsers = (ids) => {
            console.log("👥 [ADMIN] ===== online-users event =====");
            console.log("👥 [ADMIN] Received user IDs:", ids);
            console.log("👥 [ADMIN] ===== End online-users event =====");
        };

        const handleUserOnline = (userId) => {
            console.log("✅ [ADMIN] ===== user-online event =====");
            console.log("✅ [ADMIN] User came online:", userId);
            console.log("✅ [ADMIN] ===== End user-online event =====");
        };

        const handleUserOffline = (data) => {
            console.log("❌ [ADMIN] ===== user-offline event =====");
            console.log("❌ [ADMIN] User went offline:", data);
            console.log("❌ [ADMIN] ===== End user-offline event =====");
        };

        console.log("👂 [ADMIN] Attaching event listeners...");
        socket.on("userOnlineStatus", handleUserOnlineStatus);
        socket.on("online-users", handleOnlineUsers);
        socket.on("user-online", handleUserOnline);
        socket.on("user-offline", handleUserOffline);
        console.log("✅ [ADMIN] All event listeners attached");

        return () => {
            console.log("🧹 [ADMIN] Cleaning up socket listeners...");
            socket.offAny(anyEventHandler);
            socket.off("userOnlineStatus", handleUserOnlineStatus);
            socket.off("online-users", handleOnlineUsers);
            socket.off("user-online", handleUserOnline);
            socket.off("user-offline", handleUserOffline);
        };
    }, []);

    // ----------------------------------------------------------------
    // 🎯 DEBUG: Log state changes
    // ----------------------------------------------------------------
    useEffect(() => {
        console.log("🔄 [ADMIN STATE] onlineUserIdsSet changed:", Array.from(onlineUserIdsSet));
    }, [onlineUserIdsSet]);

    useEffect(() => {
        console.log("🔄 [ADMIN STATE] lastSeenData changed:", lastSeenData);
    }, [lastSeenData]);

    useEffect(() => {
        console.log("🔄 [ADMIN STATE] users changed:", users.map(u => ({ id: u._id, name: u.name })));
    }, [users]);

    // ----------------------------------------------------------------
    // 🎯 INCOMING CALL HANDLER
    // ----------------------------------------------------------------
    useEffect(() => {
        const handleIncomingCall = ({ signal, from, name, callType: incomingCallType, callId }) => {
            console.log("📞 [ADMIN] ========== INCOMING CALL ==========");
            console.log("📞 [ADMIN] From:", from);
            console.log("📞 [ADMIN] Name:", name);
            console.log("📞 [ADMIN] Call Type:", incomingCallType);
            console.log("📞 [ADMIN] Call ID:", callId);
            console.log("📞 [ADMIN] Signal:", signal ? "Present" : "Missing");
            
            const caller = users.find(u => u._id === from) || { _id: from, name, email: "" };
            console.log("📞 [ADMIN] Caller info:", caller);
            
            // Store signal globally for CallModal to access
            window.incomingCallSignal = signal;
            window.incomingCallFrom = from;
            
            setCallTargetUser(caller);
            setCallType(incomingCallType || "audio");
            setIsCallModalOpen(true);
            console.log("📞 [ADMIN] Call modal opened for incoming call");
        };

        socket.on("incomingCall", handleIncomingCall);
        return () => socket.off("incomingCall", handleIncomingCall);
    }, [users]);

    // ----------------------------------------------------------------
    // 🎯 POLLING: Unread counts
    // ----------------------------------------------------------------
    useEffect(() => {
        const interval = setInterval(() => {
            fetchUnreadCounts();
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    // ----------------------------------------------------------------
    // 🎯 POLLING: Messages for selected user
    // ----------------------------------------------------------------
    useEffect(() => {
        if (selectedUser) {
            fetchMessages(selectedUser._id);
            pollingIntervalRef.current = setInterval(() => {
                fetchMessages(selectedUser._id);
            }, 2000);
        } else {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        }

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        };
    }, [selectedUser]);

    // ----------------------------------------------------------------
    // 🎯 RECEIVE MESSAGE HANDLER
    // ----------------------------------------------------------------
    useEffect(() => {
        const handleReceiveMessage = (msg) => {
            fetchUnreadCounts();
            if (selectedUser && (msg.sender === selectedUser._id || msg.receiver === selectedUser._id)) {
                setMessages((prev) => {
                    const exists = prev.some(m => 
                        m._id === msg._id || 
                        (m.sender === msg.sender && m.receiver === msg.receiver && m.content === msg.content &&
                         Math.abs(new Date(m.createdAt) - new Date(msg.createdAt)) < 1000)
                    );
                    return exists ? prev : [...prev, msg];
                });
            }
        };

        socket.on("receiveMessage", handleReceiveMessage);
        return () => socket.off("receiveMessage", handleReceiveMessage);
    }, [selectedUser]);

    // ----------------------------------------------------------------
    // 🎯 OPEN CHAT WITH USER
    // ----------------------------------------------------------------
    const openChat = async (user) => {
        if (!admin) return;
        setLoading(true);
        setSelectedUser(user);
        
        try {
            const res = await api.get(`/messages/${user._id}`);
            setMessages(res.data);
            setUnreadCounts(prev => {
                const newCounts = { ...prev };
                delete newCounts[user._id];
                return newCounts;
            });
        } catch (error) {
            console.error("Error loading chat:", error);
            setMessages([]);
        } finally {
            setLoading(false);
        }
    };

    // ----------------------------------------------------------------
    // 🎯 SEND MESSAGE
    // ----------------------------------------------------------------
    const sendMessage = async () => {
        if (!newMsg.trim() || !admin || !selectedUser) return;

        const msgData = {
            sender: admin._id,
            receiver: selectedUser._id,
            content: newMsg.trim(),
        };

        try {
            const response = await api.post("/messages", msgData);
            setMessages((prev) => [...prev, response.data]);
            socket.emit("sendMessage", response.data);
            setNewMsg("");
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
        if (!selectedUser) {
            alert("Please select a user to call");
            return;
        }
        
        const isUserOnline = onlineUserIdsSet.has(selectedUser._id);
        console.log(`📞 [ADMIN] Attempting to call ${selectedUser.name} (${selectedUser._id})`);
        console.log(`📞 [ADMIN] Call type: ${type}`);
        console.log(`📞 [ADMIN] Is user online?`, isUserOnline);
        console.log(`📞 [ADMIN] Current online set:`, Array.from(onlineUserIdsSet));
        
        if (!isUserOnline) {
            alert("User is offline");
            return;
        }
        
        console.log("📞 [ADMIN] Starting call to user:", selectedUser.name);
        setCallTargetUser(selectedUser);
        setCallType(type); // Fixed: should be the call type (audio/video), not "outgoing"
        // Clear any previous incoming call data
        window.incomingCallSignal = null;
        window.incomingCallFrom = null;
        setIsCallModalOpen(true);
    };

    const closeCall = () => {
        console.log("📴 [ADMIN] Closing call modal");
        setIsCallModalOpen(false);
        setCallType("audio"); // Reset to default call type
        setCallTargetUser(null);
        window.incomingCallSignal = null;
        window.incomingCallFrom = null;
    };

    if (!admin) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-black">Loading...</p>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50">
            {isCallModalOpen && callTargetUser && (
                <CallModal
                    isOpen={isCallModalOpen}
                    onClose={closeCall}
                    callType={callType}
                    otherUser={callTargetUser}
                    currentUser={admin}
                    isInitiator={!window.incomingCallSignal}
                    incomingSignal={window.incomingCallSignal}
                />
            )}

            {/* Sidebar */}
            <div className="w-80 bg-white border-r shadow-sm overflow-y-auto">
                <div className="p-4 border-b bg-blue-600 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold">Admin Dashboard</h2>
                            <p className="text-sm opacity-90">{admin.name}</p>
                            <p className="text-xs opacity-75">ID: {admin._id}</p>
                        </div>
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
                
                <div className="p-4">
                    <h3 className="text-sm font-semibold text-black mb-3">
                        ALL USERS ({users.length})
                    </h3>
                    <div className="text-xs text-gray-500 mb-2">
                        Online IDs: {Array.from(onlineUserIdsSet).join(', ') || 'none'}
                    </div>
                    {users.length === 0 ? (
                        <p className="text-sm text-black">No users yet</p>
                    ) : (
                        users.map((user) => {
                            const unreadCount = unreadCounts[user._id] || 0;
                            const isOnline = onlineUserIdsSet.has(user._id);
                            const lastSeen = lastSeenData[user._id];
                            
                            return (
                                <div
                                    key={user._id}
                                    onClick={() => openChat(user)}
                                    className={`cursor-pointer p-3 rounded-lg mb-2 transition-colors relative ${
                                        selectedUser?._id === user._id
                                            ? "bg-blue-100 border-2 border-blue-500"
                                            : "bg-gray-50 hover:bg-gray-100"
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className="relative">
                                                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div 
                                                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                                                        isOnline ? "bg-green-500" : "bg-gray-400"
                                                    }`}
                                                    title={isOnline ? "Online" : "Offline"}
                                                />
                                            </div>
                                            
                                            <div className="flex-1">
                                                <div className="font-medium text-black">
                                                    {user.name}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {user._id}
                                                </div>
                                                <div className="text-xs text-black">
                                                    {isOnline ? (
                                                        <span className="text-green-600 font-semibold">Online</span>
                                                    ) : (
                                                        <span>Last seen {getLastSeenText(lastSeen)}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {unreadCount > 0 && (
                                            <div className="bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                                                {unreadCount}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Chat Window */}
            <div className="flex-1 flex flex-col">
                {selectedUser ? (
                    <>
                        <div className="bg-white border-b p-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                            {selectedUser.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div 
                                            className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                                                onlineUserIdsSet.has(selectedUser._id) ? "bg-green-500" : "bg-gray-400"
                                            }`}
                                        />
                                    </div>
                                    
                                    <div>
                                        <h2 className="font-bold text-lg text-black">
                                            {selectedUser.name}
                                        </h2>
                                        <p className="text-sm text-black">
                                            {onlineUserIdsSet.has(selectedUser._id) ? (
                                                <span className="text-green-600 font-semibold">Online</span>
                                            ) : (
                                                <span>Last seen {getLastSeenText(lastSeenData[selectedUser._id])}</span>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => startCall("audio")}
                                        disabled={!onlineUserIdsSet.has(selectedUser._id)}
                                        className={`p-3 rounded-lg transition-colors ${
                                            onlineUserIdsSet.has(selectedUser._id)
                                                ? "bg-green-500 hover:bg-green-600 text-white"
                                                : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                        }`}
                                        title="Voice Call"
                                    >
                                        📞
                                    </button>
                                    <button
                                        onClick={() => startCall("video")}
                                        disabled={!onlineUserIdsSet.has(selectedUser._id)}
                                        className={`p-3 rounded-lg transition-colors ${
                                            onlineUserIdsSet.has(selectedUser._id)
                                                ? "bg-blue-500 hover:bg-blue-600 text-white"
                                                : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                        }`}
                                        title="Video Call"
                                    >
                                        📹
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                            {loading ? (
                                <div className="text-center text-black">Loading messages...</div>
                            ) : messages.length === 0 ? (
                                <div className="text-center text-black mt-10">
                                    No messages yet. Start the conversation!
                                </div>
                            ) : (
                                <>
                                    {messages.map((msg, i) => {
                                        const msgSenderId = typeof msg.sender === 'object' ? msg.sender._id : msg.sender;
                                        const adminId = admin._id;
                                        const isAdmin = msgSenderId === adminId;
                                        
                                        return (
                                            <div
                                                key={msg._id || i}
                                                className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
                                            >
                                                <div
                                                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow ${
                                                        isAdmin ? "bg-blue-600 text-white" : "bg-white text-black"
                                                    }`}
                                                >
                                                    <p className="break-words">{msg.content}</p>
                                                    <p className={`text-xs mt-1 ${isAdmin ? "text-blue-100" : "text-gray-500"}`}>
                                                        {new Date(msg.createdAt).toLocaleTimeString([], {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </>
                            )}
                        </div>

                        <div className="bg-white border-t p-4">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    className="border border-gray-300 p-3 flex-grow rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                                    placeholder="Type your message..."
                                    value={newMsg}
                                    onChange={(e) => setNewMsg(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={!newMsg.trim()}
                                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="text-6xl mb-4">💬</div>
                            <p className="text-black text-lg">Select a user to start chatting</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}