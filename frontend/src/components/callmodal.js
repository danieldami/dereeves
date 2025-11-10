"use client";
import { useEffect, useRef, useState } from "react";
import Peer from "simple-peer";
import socket from "@/utils/socket";

export default function CallModal({ 
  isOpen, 
  onClose, 
  callType, 
  otherUser, 
  currentUser,
  isInitiator,
  incomingSignal 
}) {
  const [callStatus, setCallStatus] = useState(isInitiator ? "ringing" : "connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callStartTime, setCallStartTime] = useState(null);
  const [remoteStreamReceived, setRemoteStreamReceived] = useState(false);

  const myVideo = useRef();
  const otherVideo = useRef();
  const peerRef = useRef();
  const streamRef = useRef();
  const retriedRef = useRef(false);
  const remoteMediaRef = useRef(null);
  const iceStateRef = useRef('new');
  const iceStateTimestamp = useRef(Date.now()); // Track when ICE state changed
  const connectionTimeoutRef = useRef(null);
  const callActiveRef = useRef(false);
  const isEndingCallRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    // Reset refs when modal opens
    callActiveRef.current = false;
    isEndingCallRef.current = false;
    iceStateRef.current = 'new';

    console.log("🎬 ========== CALL MODAL OPENED ==========");
    console.log("📞 isInitiator:", isInitiator);
    console.log("📞 callType:", callType);
    console.log("📞 otherUser:", otherUser?._id);
    console.log("📞 currentUser:", currentUser?._id);
    console.log("📞 incomingSignal:", incomingSignal ? "Present" : "Missing");

    const startCall = async () => {
      // ICE candidate queue - must be declared at top of function scope
      const candidateQueue = [];
      let remoteDescriptionSet = false;
      
      try {
        // Check if getUserMedia is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Camera/microphone access is not available. Please use HTTPS or check browser compatibility.");
        }
        
        console.log("🎤 Requesting media permissions...");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: callType === "video" ? { 
            width: { ideal: 1280 }, 
            height: { ideal: 720 },
            facingMode: "user"
          } : false,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

        console.log("✅ Media stream obtained:", stream.getTracks().map(t => t.kind));
        streamRef.current = stream;
        
        if (myVideo.current) {
          myVideo.current.srcObject = stream;
        }

        console.log("🔗 Creating peer connection...");

        // Build ICE servers with STUN and TURN (required due to AP isolation on WiFi)
        const iceServers = [
          // STUN servers
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
          
          // Your VPS TURN server (primary)
          {
            urls: "turn:167.88.39.87:3478",
            username: "dereeves",
            credential: "SecureTurnPass2024!",
          },
          {
            urls: "turn:167.88.39.87:3478?transport=tcp",
            username: "dereeves",
            credential: "SecureTurnPass2024!",
          },
          
          // Backup: OpenRelay TURN
          {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject",
          }
        ];
        
        // Allow override from environment variables if provided
        const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
        const turnUser = process.env.NEXT_PUBLIC_TURN_USERNAME;
        const turnCred = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;
        
        if (turnUrl && turnUser && turnCred) {
          console.log("🧭 Using custom TURN server from env:", turnUrl);
          iceServers.push(
            { 
              urls: turnUrl, 
              username: turnUser, 
              credential: turnCred 
            }
          );
        } else {
          console.log("🧭 Using default TURN servers (Metered.ca)");
        }

        // Log the actual ICE servers configuration
        console.log("🔍 ICE Servers configured:", iceServers.length, "servers");
        console.log("🔍 TURN servers:", iceServers.filter(s => s.urls.includes('turn')).length);
        console.log("🔍 Full config:", JSON.stringify(iceServers, null, 2));

        const peer = new Peer({
          initiator: isInitiator,
          trickle: true, // Enable trickle ICE - send signal immediately
          stream: stream,
          config: {
            iceServers,
            iceTransportPolicy: 'all', // Try all connection types
            iceCandidatePoolSize: 10,
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require'
          }
        });

        peerRef.current = peer;

        // Low-level ICE state diagnostics
        try {
          const pc = peer._pc; // simple-peer underlying RTCPeerConnection
          if (pc) {
            // Override connection state change to prevent auto-destroy
            const originalOnConnectionStateChange = pc.onconnectionstatechange;
            pc.onconnectionstatechange = () => {
              console.log("🔗 Connection state:", pc.connectionState);
              
              // Prevent simple-peer from auto-destroying on failed state
              if (pc.connectionState === 'failed' && !callActiveRef.current) {
                console.warn("⚠️ Connection state 'failed' but preventing auto-destroy - giving ICE more time");
                // Don't call the original handler which would destroy the peer
                return;
              }
              
              // Call original handler for other states
              if (originalOnConnectionStateChange) {
                originalOnConnectionStateChange.call(pc);
              }
            };
            
            pc.oniceconnectionstatechange = () => {
              const previousState = iceStateRef.current;
              const currentState = pc.iceConnectionState;
              const stateTime = Date.now();
              const timeSinceLastChange = stateTime - iceStateTimestamp.current;
              
              // Update state tracking
              iceStateRef.current = currentState;
              iceStateTimestamp.current = stateTime;
              
              console.log(`🌐 ICE state: ${previousState} → ${currentState} (after ${timeSinceLastChange}ms)`);
              
              if (currentState === "connected" || currentState === "completed") {
                console.log("✅ ICE connection established successfully!");
                callActiveRef.current = true;
                setCallStatus("active");
                
                // Clear the connection timeout
                if (connectionTimeoutRef.current) {
                  clearTimeout(connectionTimeoutRef.current);
                  connectionTimeoutRef.current = null;
                  console.log("✅ Connection timeout cleared - call is active");
                }
                
                if (!callStartTime) {
                  setCallStartTime(Date.now());
                }
              }
              else if (currentState === "checking") {
                console.log("🔍 ICE checking - gathering and testing candidates...");
                setCallStatus("connecting");
              }
              else if (currentState === "disconnected") {
                console.warn("⚠️ ICE disconnected - WebRTC will attempt to reconnect via TURN relay");
                console.warn(`⚠️ Time in previous state (${previousState}): ${timeSinceLastChange}ms`);
                
                // If we were connected before, this is a temporary disconnection
                if (previousState === "connected" || previousState === "completed") {
                  console.log("🔄 Temporary disconnection from active call - waiting for reconnection...");
                  // Don't change status, keep showing as active
                } else {
                  setCallStatus("connecting");
                }
              }
              else if (currentState === "failed") {
                console.error("❌ ICE connection failed after all attempts");
                console.error(`❌ Time in disconnected state: ${timeSinceLastChange}ms`);
                console.error("❌ Possible causes:");
                console.error("   • Both users behind symmetric NAT");
                console.error("   • TURN server unreachable");
                console.error("   • Firewall blocking WebRTC ports");
                
                // Don't auto-end, let timeout handler deal with it
                // This gives TURN relay maximum time to work
              }
              else if (currentState === "closed") {
                console.log("🔴 ICE connection closed");
              }
            };
            
            // Also monitor ICE gathering state
            pc.onicegatheringstatechange = () => {
              console.log("🧊 ICE gathering state:", pc.iceGatheringState);
            };
            
            // Manually forward ICE candidates
            const candidateCount = { host: 0, srflx: 0, relay: 0 };
            pc.onicecandidate = (event) => {
              if (event.candidate) {
                const type = event.candidate.type;
                candidateCount[type] = (candidateCount[type] || 0) + 1;
                const emoji = type === 'relay' ? '🔄' : type === 'srflx' ? '🌐' : '🏠';
                console.log(`🧊 ${emoji} ICE candidate #${Object.values(candidateCount).reduce((a,b) => a+b, 0)}: ${type.toUpperCase()} - ${event.candidate.candidate}`);
                
                // Send the candidate to the other peer
                console.log("📡 Sending ICE candidate to:", otherUser._id);
                socket.emit("signal", {
                  signal: { candidate: event.candidate },
                  to: otherUser._id
                });
              } else {
                console.log("🧊 ========== ICE GATHERING COMPLETE ==========");
                console.log("📊 Total candidates:", candidateCount);
                console.log("📊 Breakdown: HOST=" + (candidateCount.host||0) + ", SRFLX=" + (candidateCount.srflx||0) + ", RELAY=" + (candidateCount.relay||0));
                if (!candidateCount.relay || candidateCount.relay === 0) {
                  console.warn("⚠️ WARNING: No TURN relay candidates! Connection may fail across different networks.");
                  console.warn("⚠️ Possible issues: TURN servers unreachable, credentials invalid, or network blocking TURN ports.");
                }
              }
            };
          }
        } catch (e) {
          console.warn("⚠️ Could not access peer connection internals:", e);
        }

        let initialSignalSent = false;
        peer.on("signal", (signal) => {
          console.log("📡 ========== PEER SIGNAL GENERATED ==========");
          console.log("📡 Signal type:", signal.type || "candidate");
          console.log("📡 Has SDP:", !!signal.sdp);
          console.log("📡 Contains candidate:", !!signal.candidate);
          console.log("📡 Initial signal sent:", initialSignalSent);

          // Only send the initial offer/answer SDP
          // ICE candidates are handled manually via pc.onicecandidate
          if ((signal.type === "offer" || signal.type === "answer" || signal.sdp) && !initialSignalSent) {
            initialSignalSent = true;
            console.log("📡 ✅ Sending initial", signal.type || "SDP", "to other user");

            if (isInitiator) {
              console.log("📞 CALLER: Emitting callUser to:", otherUser._id);
              socket.emit("callUser", {
                userToCall: otherUser._id,
                from: currentUser._id,
                name: currentUser.name,
                signal,
                callType
              });
              console.log("✅ callUser emitted");
            } else {
              console.log("✅ RECEIVER: Emitting answerCall to:", otherUser._id);
              socket.emit("answerCall", {
                signal,
                to: otherUser._id
              });
              console.log("✅ answerCall emitted");
            }
          } else {
            console.log("⏭️ Skipping signal - ICE candidates handled separately");
          }
        });

        peer.on("stream", (remoteStream) => {
          console.log("📺 ========== REMOTE STREAM RECEIVED ==========");
          console.log("📺 Tracks:", remoteStream.getTracks().map(t => t.kind));
          callActiveRef.current = true;
          setCallStatus("active");
          setRemoteStreamReceived(true);
          
          // Clear the connection timeout
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
            console.log("✅ Connection timeout cleared - stream received");
          }
          
          // Start timer when stream is received (for receiver)
          if (!callStartTime) {
            setCallStartTime(Date.now());
          }
          
          if (otherVideo.current) {
            try {
              otherVideo.current.srcObject = remoteStream;
              const videoEl = otherVideo.current;
              const safePlay = () => {
                const playPromise = videoEl.play();
                if (playPromise && typeof playPromise.then === 'function') {
                  playPromise.catch(err => {
                    // AbortError can happen if srcObject changes quickly; ignore
                    if (err && (err.name === 'AbortError' || err.message?.includes('interrupted'))) {
                      console.warn('⚠️ Video play interrupted, retrying shortly...');
                      setTimeout(() => {
                        videoEl.play().catch(() => {});
                      }, 150);
                    } else {
                      console.error('Play error:', err);
                    }
                  });
                }
              };
              if (videoEl.readyState >= 2) {
                safePlay();
              } else {
                const onLoaded = () => {
                  videoEl.removeEventListener('loadedmetadata', onLoaded);
                  safePlay();
                };
                videoEl.addEventListener('loadedmetadata', onLoaded);
              }
            } catch (e) {
              console.error('Error attaching remote stream:', e);
            }
          }
        });

        // Some browsers are more reliable with track events
        peer.on('track', (track, stream) => {
          console.log('🎯 TRACK event:', track.kind);
          setRemoteStreamReceived(true);
          try {
            if (!remoteMediaRef.current) {
              remoteMediaRef.current = new MediaStream();
            }
            if (!remoteMediaRef.current.getTracks().find(t => t.id === track.id)) {
              remoteMediaRef.current.addTrack(track);
            }
            if (otherVideo.current) {
              otherVideo.current.srcObject = remoteMediaRef.current;
              const playPromise = otherVideo.current.play();
              if (playPromise && typeof playPromise.then === 'function') {
                playPromise.catch(() => {});
              }
            }
          } catch (e) {
            console.error('Error handling track:', e);
          }
        });

        peer.on("connect", () => {
          console.log("🔗 ========== PEER CONNECTED ==========");
          callActiveRef.current = true;
          setCallStatus("active");
          
          // Clear the connection timeout
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
            console.log("✅ Connection timeout cleared - peer connected");
          }
          
          if (!callStartTime) {
            setCallStartTime(Date.now()); // Start timer if not already started
          }
        });

        peer.on("error", (err) => {
          // Check if this is a harmless "stable" state error first, before logging
          if (err.message && err.message.includes("stable") && err.message.includes("setRemoteDescription")) {
            console.log("⚠️ Ignoring SDP stable state error - this is usually a harmless duplicate signal");
            return;
          }
          
          // Log other errors
          console.error("❌ ========== PEER ERROR ==========");
          console.error("❌ Error:", err);
          console.error("❌ Error type:", err.type);
          console.error("❌ Error code:", err.code);
          console.error("❌ Error message:", err.message);
          console.error("❌ Current call status:", callStatus);
          
          // Handle other SDP errors
          if (err.message && err.message.includes("setRemoteDescription")) {
            console.error("❌ SDP State Error - attempting to recover...");
            // Try to recreate the peer connection
            setTimeout(() => {
              if (peerRef.current && !peerRef.current.destroyed) {
                console.log("🔄 Attempting to recreate peer...");
                peerRef.current.destroy();
                // The component will recreate the peer on next render
              }
            }, 1000);
            return;
          }
          
          // Don't end call for transient/early connection errors; rely on connection timeout
          const isTransient = (
            err.type === 'connection-closed' ||
            err.code === 'CONNECTION_CLOSED' ||
            err.code === 'ERR_CONNECTION_FAILURE' ||
            err.message === 'Connection failed'
          );

          if (isTransient) {
            console.log("🔌 Transient connection error - ignoring, will wait for timeout or recovery");
            console.log("🔌 ICE can recover from 'disconnected' state, giving it time...");
            // DON'T destroy or retry - let ICE negotiate naturally
            return;
          }

          // Show alert and end only for significant errors after connection
          alert(`Call error: ${err.message}`);
          if (callStatus === "active") {
            setCallStatus("ended");
            setTimeout(() => endCall(), 1000);
          }
        });

        peer.on("close", () => {
          console.log("🔴 Peer connection closed");
          console.log("🔴 Call status when closed:", callStatus);
          console.log("🔴 ICE state when closed:", iceStateRef.current);
          console.log("🔴 Was call active?", callActiveRef.current);
          
          // Don't auto-end - let the user manually end or let timeout handle it
          console.log("⚠️ Peer closed but keeping call UI open - user can manually end if needed");
          // Don't set status to "ended" automatically
        });

        // If receiving call, signal the peer first, then the peer will generate its own answer signal
        if (!isInitiator && incomingSignal) {
          console.log("🔥 RECEIVER: Signaling peer with incoming signal");
          console.log("🔥 Incoming signal type:", incomingSignal.type);
          console.log("🔥 Incoming signal data:", incomingSignal);
          // Process on next tick without artificial delay
          requestAnimationFrame(() => {
            if (peerRef.current && !peerRef.current.destroyed) {
              console.log("🔥 Processing incoming signal...");
              try {
                remoteDescriptionSet = true; // Mark remote description as set
                peer.signal(incomingSignal);
                console.log("✅ Incoming signal processed successfully - peer will now generate answer signal");
                
                // Process any queued candidates from window.signalQueue
                if (window.signalQueue && window.signalQueue.length > 0) {
                  console.log(`📦 Processing ${window.signalQueue.length} early-arriving signals from queue...`);
                  window.signalQueue.forEach(queuedSignal => {
                    try {
                      if (queuedSignal.candidate) {
                        peerRef.current.signal(queuedSignal);
                        console.log("✅ Applied queued ICE candidate");
                      } else if (queuedSignal.type === 'answer' || queuedSignal.type === 'offer') {
                        // This shouldn't happen but handle it just in case
                        console.warn("⚠️ Found SDP in queue, skipping (already processed)");
                      } else {
                        peerRef.current.signal(queuedSignal);
                        console.log("✅ Applied queued signal");
                      }
                    } catch (err) {
                      console.error("❌ Failed to apply queued signal:", err);
                    }
                  });
                  window.signalQueue = []; // Clear the global queue
                }
                
                // Process any queued candidates from the local candidateQueue
                if (candidateQueue.length > 0) {
                  console.log(`📦 Processing ${candidateQueue.length} queued candidates from incoming call...`);
                  candidateQueue.forEach(candidate => {
                    try {
                      peerRef.current.signal(candidate);
                      console.log("✅ Applied queued candidate");
                    } catch (err) {
                      console.error("❌ Failed to apply queued candidate:", err);
                    }
                  });
                  candidateQueue.length = 0; // Clear queue
                }
              } catch (error) {
                console.error("❌ Error processing incoming signal:", error);
              }
            } else {
              console.error("❌ Cannot process signal - peer destroyed or not available");
            }
          });
        }

        // Failsafe: Monitor connection progress with smart timeout
        const checkConnectionProgress = () => {
          const elapsed = Date.now() - iceStateTimestamp.current;
          const currentState = iceStateRef.current;
          
          console.log(`⏰ Connection check: state=${currentState}, time_in_state=${elapsed}ms, active=${callActiveRef.current}`);
          
          if (callActiveRef.current) {
            console.log('✅ Connection timeout passed - call is active');
            return; // Call is active, no need to monitor
          }
          
          // If ICE is actively negotiating (checking state), give it more time
          if (currentState === 'checking') {
            if (elapsed < 90000) { // 90 seconds max in checking state
              console.log(`🔄 ICE still checking (${Math.floor(elapsed/1000)}s), extending timeout...`);
              connectionTimeoutRef.current = setTimeout(checkConnectionProgress, 15000);
              return;
            } else {
              console.error('⏰ ICE stuck in checking state for too long');
            }
          }
          
          // If disconnected but was making progress, give one more chance
          if (currentState === 'disconnected' && elapsed < 30000) {
            console.log(`🔄 Disconnected but recent (${Math.floor(elapsed/1000)}s), waiting for recovery...`);
            connectionTimeoutRef.current = setTimeout(checkConnectionProgress, 10000);
            return;
          }
          
          // Connection failed - provide detailed error
          console.error('❌ Connection timeout - ending call');
          console.error('❌ Final state:', currentState);
          console.error('❌ Time in final state:', elapsed, 'ms');
          console.error('❌ Remote stream received:', remoteStreamReceived);
          
          let errorMsg = 'Connection failed to establish.';
          
          if (currentState === 'failed') {
            errorMsg = 'Connection failed. This usually means:\n\n' +
                       '• Your network or firewall is blocking WebRTC\n' +
                       '• The TURN relay server is unreachable\n' +
                       '• Both users are behind very restrictive NAT\n\n' +
                       'Please check your network settings and try again.';
          } else if (currentState === 'new' || currentState === 'checking') {
            errorMsg = 'Connection timed out while trying to connect.\n\n' +
                       'Please check:\n' +
                       '• Both users have stable internet connection\n' +
                       '• Firewall/antivirus is not blocking the application';
          } else if (currentState === 'disconnected') {
            errorMsg = 'Connection lost and could not be re-established.\n\n' +
                       'Please try calling again.';
          }
          
          alert(errorMsg);
          endCall();
        };
        
        // Start with initial 60-second timeout
        connectionTimeoutRef.current = setTimeout(checkConnectionProgress, 60000);

        // Handle incoming signals (including ICE candidates)
        const handleRemoteSignal = ({ signal }) => {
          if (!signal) {
            console.warn("⚠️ Signal payload missing");
            return;
          }

          // Log what type of signal we received
          if (signal.type) {
            console.log("📡 Received SDP signal:", signal.type);
          } else if (signal.candidate) {
            console.log("📡 Received ICE candidate:", signal.candidate.candidate);
          } else {
            console.log("📡 Received unknown signal:", signal);
          }

          if (peerRef.current && !peerRef.current.destroyed) {
            try {
              // If it's an SDP (offer/answer), mark that remote description will be set
              if (signal.type === 'offer' || signal.type === 'answer') {
                remoteDescriptionSet = true;
                peerRef.current.signal(signal);
                console.log("✅ Applied remote SDP");
                
                // Process any queued candidates
                if (candidateQueue.length > 0) {
                  console.log(`📦 Processing ${candidateQueue.length} queued candidates...`);
                  candidateQueue.forEach(candidate => {
                    try {
                      peerRef.current.signal(candidate);
                      console.log("✅ Applied queued candidate");
                    } catch (err) {
                      console.error("❌ Failed to apply queued candidate:", err);
                    }
                  });
                  candidateQueue.length = 0; // Clear queue
                }
              } 
              // If it's a candidate and remote description isn't set yet, queue it
              else if (signal.candidate && !remoteDescriptionSet) {
                console.log("📥 Queuing candidate until remote description is set");
                candidateQueue.push(signal);
              }
              // If it's a candidate and remote description is set, apply immediately
              else if (signal.candidate) {
                peerRef.current.signal(signal);
                console.log("✅ Applied remote candidate");
              }
              // Other signals (shouldn't happen, but handle gracefully)
              else {
                peerRef.current.signal(signal);
                console.log("✅ Applied remote signal");
              }
            } catch (error) {
              console.error("❌ Failed to apply remote signal:", error);
              console.error("❌ Signal data:", signal);
            }
          } else {
            console.warn("⚠️ Cannot apply signal: peer is destroyed or not initialized");
          }
        };

        const handleCallAccepted = ({ signal }) => {
          console.log("✅ ========== CALL ACCEPTED ==========");
          console.log("✅ Received answer signal:", signal);
          setCallStatus("connecting");
          
          if (peerRef.current && !peerRef.current.destroyed) {
            console.log("📡 Signaling peer with answer");
            console.log("📡 Current peer state:", peerRef.current.destroyed ? "destroyed" : "active");
            console.log("📡 Answer signal type:", signal?.type);
            console.log("📡 Answer signal:", signal);
            
            try {
              // Check if the peer connection is in a valid state to receive an answer
              if (signal) {
                remoteDescriptionSet = true; // Mark remote description as set
                peerRef.current.signal(signal);
                console.log("✅ Answer signal processed successfully");
                
                // Process any queued candidates
                if (candidateQueue.length > 0) {
                  console.log(`📦 Processing ${candidateQueue.length} queued candidates from callAccepted...`);
                  candidateQueue.forEach(candidate => {
                    try {
                      peerRef.current.signal(candidate);
                      console.log("✅ Applied queued candidate");
                    } catch (err) {
                      console.error("❌ Failed to apply queued candidate:", err);
                    }
                  });
                  candidateQueue.length = 0; // Clear queue
                }
                
                // Start timer when call is accepted (for caller)
                setCallStartTime(Date.now());
              } else {
                console.warn("⚠️ No signal provided in callAccepted event");
              }
            } catch (error) {
              console.error("❌ Error signaling peer:", error);
              console.error("❌ Error details:", error.message, error.stack);
              // Don't try to recover if it's an SDP state error - it might be a duplicate signal
              if (error.message && error.message.includes("stable")) {
                console.log("⚠️ Peer is already in stable state - ignoring duplicate signal");
                // Start timer anyway as call might already be connected
                if (!callStartTime) {
                  setCallStartTime(Date.now());
                }
              } else {
                // For other errors, try to recreate the peer
                console.log("🔄 Attempting to recreate peer connection...");
                setTimeout(() => {
                  if (peerRef.current && !peerRef.current.destroyed) {
                    try {
                      peerRef.current.signal(signal);
                      setCallStartTime(Date.now());
                    } catch (retryError) {
                      console.error("❌ Retry also failed:", retryError);
                    }
                  }
                }, 1000);
              }
            }
          } else {
            console.warn("⚠️ Cannot signal - peer destroyed or not available");
          }
        };

        const handleCallRejected = () => {
          console.log("❌ Call rejected");
          setCallStatus("ended");
          alert("Call was rejected");
          setTimeout(() => endCall(), 1000);
        };

        const handleCallEnded = (data) => {
          if (isEndingCallRef.current) {
            console.log("⚠️ Already ending call, ignoring duplicate callEnded event");
            return;
          }
          
          console.log("🔴 ========== CALL ENDED BY OTHER USER ==========");
          console.log("🔴 Event data:", data);
          console.log("🔴 Current user:", currentUser._id);
          console.log("🔴 Other user:", otherUser._id);
          console.log("🔴 Call status:", callStatus);
          console.log("🔴 ICE state:", iceStateRef.current);
          console.log("🔴 Call was active:", callActiveRef.current);
          
          isEndingCallRef.current = true;
          setCallStatus("ended");
          
          // Clear connection timeout if still active
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
            console.log("✅ Connection timeout cleared");
          }
          
          // Clean up media streams
          if (streamRef.current) {
            console.log("🧹 Stopping local media tracks");
            streamRef.current.getTracks().forEach(track => {
              track.stop();
              console.log("  Stopped:", track.kind, "track");
            });
            streamRef.current = null;
          }
          
          // Clean up remote media
          if (remoteMediaRef.current) {
            try {
              remoteMediaRef.current.getTracks().forEach(t => t.stop());
              remoteMediaRef.current = null;
            } catch (err) {
              console.warn("⚠️ Error stopping remote tracks:", err);
            }
          }
          
          // Destroy peer connection
          if (peerRef.current) {
            if (!peerRef.current.destroyed) {
              console.log("🧹 Destroying peer connection");
              try {
                peerRef.current.destroy();
              } catch (err) {
                console.warn("⚠️ Error destroying peer:", err);
              }
            }
            peerRef.current = null;
          }
          
          // Reset state
          setCallDuration(0);
          setCallStartTime(null);
          setRemoteStreamReceived(false);
          
          console.log("✅ Cleanup complete, closing modal in 500ms");
          console.log("🔴 ==========================================");
          
          // Close modal without emitting endCall again (other user already knows)
          setTimeout(() => {
            onClose();
          }, 500);
        };

        const handleCallTimeout = () => {
          console.log("⏰ Call timed out");
          setCallStatus("ended");
          alert("Call timed out - no answer");
          setTimeout(() => endCall(), 1000);
        };

        const handleCallError = ({ message }) => {
          console.log("❌ Call error:", message);
          setCallStatus("ended");
          alert(`Call error: ${message}`);
          setTimeout(() => endCall(), 1000);
        };

        // Only set up event listeners that are relevant
        if (isInitiator) {
          // Caller events
          socket.on("callAccepted", handleCallAccepted);
          socket.on("callRejected", handleCallRejected);
          socket.on("callTimeout", handleCallTimeout);
          socket.on("callError", handleCallError);
        }
        
        // Common events for both caller and receiver
        socket.on("callEnded", handleCallEnded);
        socket.on("signal", handleRemoteSignal);

        return () => {
          // Clear the connection timeout
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
          }
          
          // Remove socket listeners
          if (isInitiator) {
            socket.off("callAccepted", handleCallAccepted);
            socket.off("callRejected", handleCallRejected);
            socket.off("callTimeout", handleCallTimeout);
            socket.off("callError", handleCallError);
          }
          socket.off("callEnded", handleCallEnded);
          socket.off("signal", handleRemoteSignal);
        };

      } catch (error) {
        console.error("❌ Error starting call:", error);
        alert(`Could not access camera/microphone: ${error.message}`);
        onClose();
      }
    };

    startCall();

    return () => {
      console.log("🧹 Cleaning up call...");
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          console.log("Stopping track:", track.kind);
          track.stop();
        });
        streamRef.current = null;
      }
      if (remoteMediaRef.current) {
        try {
          remoteMediaRef.current.getTracks().forEach(t => t.stop());
        } catch (_) {}
        remoteMediaRef.current = null;
      }
      if (peerRef.current && !peerRef.current.destroyed) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
    };
  }, [isOpen]);

  // Call timer effect
  useEffect(() => {
    let interval;
    if (callStartTime && callStatus === "active") {
      interval = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartTime) / 1000));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callStartTime, callStatus]);

  const endCall = () => {
    if (isEndingCallRef.current) {
      console.log("⚠️ Already ending call, skipping duplicate endCall");
      return;
    }
    
    console.log("📴 ========== ENDING CALL ==========");
    console.log("📴 Initiated by:", currentUser._id);
    console.log("📴 Notifying:", otherUser._id);
    console.log("📴 Call status:", callStatus);
    console.log("📴 ICE state:", iceStateRef.current);
    console.log("📴 Call duration:", callDuration, "seconds");
    isEndingCallRef.current = true;
    
    // Clear connection timeout if still active
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
      console.log("✅ Connection timeout cleared");
    }
    
    // Emit endCall socket event with both to and from
    try {
      socket.emit("endCall", { 
        to: otherUser._id,
        from: currentUser._id 
      });
      console.log("✅ endCall event emitted to backend");
    } catch (err) {
      console.error("❌ Failed to emit endCall event:", err);
    }
    
    // Clean up media streams
    if (streamRef.current) {
      console.log("🧹 Stopping local media tracks");
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log("  Stopped:", track.kind, "track");
      });
      streamRef.current = null;
    }
    
    // Clean up remote media
    if (remoteMediaRef.current) {
      try {
        remoteMediaRef.current.getTracks().forEach(t => t.stop());
        remoteMediaRef.current = null;
      } catch (err) {
        console.warn("⚠️ Error stopping remote tracks:", err);
      }
    }
    
    // Destroy peer connection
    if (peerRef.current) {
      if (!peerRef.current.destroyed) {
        console.log("🧹 Destroying peer connection");
        try {
          peerRef.current.destroy();
        } catch (err) {
          console.warn("⚠️ Error destroying peer:", err);
        }
      }
      peerRef.current = null;
    }
    
    // Reset state
    setCallDuration(0);
    setCallStartTime(null);
    setRemoteStreamReceived(false);
    
    console.log("✅ Call cleanup complete, closing modal");
    console.log("📴 ==================================");
    onClose();
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleMute = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        console.log("🔇 Mute:", !audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (streamRef.current && callType === "video") {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
        console.log("📹 Video off:", !videoTrack.enabled);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 max-w-5xl w-full mx-4">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-white">
            {callStatus === "ringing" && "📞 Calling..."}
            {callStatus === "connecting" && "🔄 Connecting..."}
            {callStatus === "active" && `✅ In call with ${otherUser.name}`}
            {callStatus === "ended" && "🔴 Call Ended"}
          </h2>
          <p className="text-gray-400">{otherUser.email || otherUser.name}</p>
          <p className="text-xs text-gray-500 mt-1">
            Remote stream: {remoteStreamReceived ? <span className="text-green-400">Yes</span> : <span className="text-red-400">No</span>} · ICE: <span className="text-blue-300">{iceStateRef.current}</span>
          </p>
          {callStatus === "active" && callDuration > 0 && (
            <p className="text-green-400 font-mono text-lg">
              {formatDuration(callDuration)}
            </p>
          )}
        </div>

        <div className="relative bg-black rounded-lg overflow-hidden mb-4" style={{ height: "500px" }}>
          <video
            ref={otherVideo}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

          {callType === "video" && (
            <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-white shadow-lg">
              <video
                ref={myVideo}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {callType === "audio" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="text-8xl mb-4">🎤</div>
                <p className="text-2xl font-semibold">Audio Call</p>
                <p className="text-lg text-gray-400 mt-2">{callStatus}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-6">
          <button
            onClick={toggleMute}
            className={`p-5 rounded-full transition-all transform hover:scale-110 ${
              isMuted ? "bg-red-500 hover:bg-red-600" : "bg-gray-700 hover:bg-gray-600"
            } text-white text-3xl shadow-lg`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? "🔇" : "🎤"}
          </button>

          {callType === "video" && (
            <button
              onClick={toggleVideo}
              className={`p-5 rounded-full transition-all transform hover:scale-110 ${
                isVideoOff ? "bg-red-500 hover:bg-red-600" : "bg-gray-700 hover:bg-gray-600"
              } text-white text-3xl shadow-lg`}
              title={isVideoOff ? "Turn on video" : "Turn off video"}
            >
              {isVideoOff ? "📹" : "📷"}
            </button>
          )}

          <button
            onClick={endCall}
            className="p-5 px-10 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-lg shadow-lg transform hover:scale-110 transition-all"
          >
            End Call
          </button>
        </div>
      </div>
    </div>
  );
}