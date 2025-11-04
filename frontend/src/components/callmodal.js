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

        // STUN only (like Saturday's working version!)
        const iceServers = [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
          { urls: "stun:stun3.l.google.com:19302" },
          { urls: "stun:stun4.l.google.com:19302" }
        ];
        console.log("🧭 Using STUN only (Saturday's working config)");

        const peer = new Peer({
          initiator: isInitiator,
          trickle: true, // Enable trickle ICE - send signal immediately
          stream: stream,
          config: {
            iceServers
          }
        });

        peerRef.current = peer;

        // Low-level ICE state diagnostics
        try {
          const pc = peer._pc; // simple-peer underlying RTCPeerConnection
          console.log("🔍 peer._pc available:", !!pc);
          console.log("🔍 peer object:", peer);
          
          if (pc) {
            // Log initial ICE state
            console.log("🌐 INITIAL ICE state:", pc.iceConnectionState);
            console.log("🌐 INITIAL connection state:", pc.connectionState);
            console.log("🌐 Signaling state:", pc.signalingState);
            
            pc.oniceconnectionstatechange = () => {
              iceStateRef.current = pc.iceConnectionState;
              console.log("🌐 ICE STATE CHANGED TO:", pc.iceConnectionState);
              console.log("🌐 Connection state:", pc.connectionState);
              
              if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
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
                
                // Check WebRTC stats to see if audio is being transmitted
                setTimeout(() => {
                  pc.getStats(null).then(stats => {
                    let foundInbound = false;
                    let foundOutbound = false;
                    stats.forEach(report => {
                      if (report.type === 'inbound-rtp' && report.kind === 'audio') {
                        foundInbound = true;
                        console.log('📊 INCOMING AUDIO RTP:', {
                          bytesReceived: report.bytesReceived,
                          packetsReceived: report.packetsReceived,
                          packetsLost: report.packetsLost,
                          jitter: report.jitter
                        });
                      }
                      if (report.type === 'outbound-rtp' && report.kind === 'audio') {
                        foundOutbound = true;
                        console.log('📊 OUTGOING AUDIO RTP:', {
                          bytesSent: report.bytesSent,
                          packetsSent: report.packetsSent
                        });
                      }
                    });
                    if (!foundInbound) console.warn('⚠️ No inbound RTP stats found!');
                    if (!foundOutbound) console.warn('⚠️ No outbound RTP stats found!');
                  }).catch(e => console.error('❌ Failed to get stats:', e));
                }, 2000);
              }
              
              // Log failures
              if (pc.iceConnectionState === "failed") {
                console.error("❌ ICE connection failed - connection cannot be established");
                console.log("💡 Tip: This usually means TURN server is needed for NAT traversal");
              } else if (pc.iceConnectionState === "disconnected") {
                console.warn("⚠️ ICE connection disconnected - may reconnect automatically");
              }
            };
            
            // Also monitor ICE gathering state
            pc.onicegatheringstatechange = () => {
              console.log("🧊 ICE gathering state:", pc.iceGatheringState);
            };
            
            // Log ICE candidates for debugging
            pc.onicecandidate = (event) => {
              if (event.candidate) {
                console.log("🧊 ICE candidate:", event.candidate.type, event.candidate.candidate);
              } else {
                console.log("🧊 ICE gathering complete");
              }
            };
          }
        } catch (e) {
          console.warn("⚠️ Could not access peer connection internals:", e);
        }

        peer.on("signal", (signal) => {
          console.log("📡 ========== PEER SIGNAL GENERATED ==========");
          console.log("📡 Signal type:", signal.type);
          console.log("📡 Signal data:", signal);
          
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
        });

        peer.on("stream", (remoteStream) => {
          console.log("📺 ========== REMOTE STREAM RECEIVED ==========");
          console.log("📺 Tracks:", remoteStream.getTracks().map(t => t.kind));
          
          // Mark call as active when stream arrives
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
          
          // Check ICE state and log warning if not connected
          setTimeout(() => {
            try {
              const pc = peerRef.current?._pc;
              if (pc) {
                console.log("🔍 ICE state after stream received:", pc.iceConnectionState);
                if (pc.iceConnectionState !== "connected" && pc.iceConnectionState !== "completed") {
                  console.warn("⚠️ WARNING: Stream received but ICE not fully connected. State:", pc.iceConnectionState);
                  // Force check stats anyway
                  pc.getStats(null).then(stats => {
                    let foundInbound = false;
                    let foundOutbound = false;
                    stats.forEach(report => {
                      if (report.type === 'inbound-rtp' && report.kind === 'audio') {
                        foundInbound = true;
                        console.log('📊 INCOMING AUDIO RTP:', {
                          bytesReceived: report.bytesReceived,
                          packetsReceived: report.packetsReceived,
                          packetsLost: report.packetsLost,
                          jitter: report.jitter
                        });
                      }
                      if (report.type === 'outbound-rtp' && report.kind === 'audio') {
                        foundOutbound = true;
                        console.log('📊 OUTGOING AUDIO RTP:', {
                          bytesSent: report.bytesSent,
                          packetsSent: report.packetsSent
                        });
                      }
                    });
                    if (!foundInbound) console.warn('⚠️ No inbound RTP stats found!');
                    if (!foundOutbound) console.warn('⚠️ No outbound RTP stats found!');
                  }).catch(e => console.error('❌ Failed to get stats:', e));
                }
              }
            } catch (e) {
              console.error("Error checking ICE state:", e);
            }
          }, 2000);
          
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
            console.log("🔌 Transient connection error - waiting for retry/timeout");
            // Single retry: recreate peer once if not already retried
            if (!retriedRef.current && peerRef.current && !peerRef.current.destroyed) {
              retriedRef.current = true;
              console.log("🔁 Attempting one-time peer retry...");
              try {
                peerRef.current.destroy();
              } catch (_) {}
              // Recreate after brief tick
              setTimeout(() => {
                if (isOpen) {
                  // trigger effect re-run by closing and reopening logic
                  // simplest is to call onClose then immediately reopen, but we avoid UI flicker
                  // Instead, call startCall again by mimicking dependency change
                  // We rely on setCallStartTime to change state and re-run timer; here we just rebuild peer
                  // Re-run startCall by toggling a benign state
                  setCallStatus(prev => prev === 'connecting' ? 'ringing' : 'connecting');
                }
              }, 200);
            }
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
          // Only set to ended if not already ended
          if (callStatus !== "ended") {
            setCallStatus("ended");
          }
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
                peer.signal(incomingSignal);
                console.log("✅ Incoming signal processed successfully - peer will now generate answer signal");
              } catch (error) {
                console.error("❌ Error processing incoming signal:", error);
              }
            } else {
              console.error("❌ Cannot process signal - peer destroyed or not available");
            }
          });
        }

        // Failsafe: end the call if connection not active within 30s
        connectionTimeoutRef.current = setTimeout(() => {
          if (!callActiveRef.current) {
            console.warn('⏰ Connection not established in time - ending call');
            console.warn('⏰ Final ICE state:', iceStateRef.current);
            console.warn('⏰ callActiveRef:', callActiveRef.current);
            
            // Provide helpful error message based on state
            let errorMsg = 'Connection failed to establish. Please try again.';
            if (iceStateRef.current === 'failed' || iceStateRef.current === 'disconnected') {
              errorMsg += '\n\nPossible causes:\n• Network/firewall restrictions\n• Both users behind restrictive NAT\n• TURN server needed for connection';
            } else if (iceStateRef.current === 'checking' || iceStateRef.current === 'new') {
              errorMsg += '\n\nConnection is still trying to establish. Please ensure:\n• Both users have stable internet\n• Firewall allows WebRTC connections';
            }
            
            alert(errorMsg);
            endCall();
          } else {
            console.log('✅ Connection timeout passed - call is active');
          }
        }, 30000);

        // Socket event handlers
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
                peerRef.current.signal(signal);
                console.log("✅ Answer signal processed successfully");
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
          
          isEndingCallRef.current = true;
          setCallStatus("ended");
          
          // Clear connection timeout if still active
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
          }
          
          // Clean up immediately when call is ended by other party
          if (streamRef.current) {
            console.log("🔴 Stopping local stream tracks");
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
          if (peerRef.current && !peerRef.current.destroyed) {
            console.log("🔴 Destroying peer connection");
            peerRef.current.destroy();
            peerRef.current = null;
          }
          
          console.log("🔴 Closing modal in 500ms");
          // Close modal without emitting endCall again
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
    
    console.log("📴 Ending call...");
    console.log("📴 From:", currentUser._id);
    console.log("📴 To:", otherUser._id);
    isEndingCallRef.current = true;
    
    // Clear connection timeout if still active
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    
    // Emit endCall socket event with both to and from
    socket.emit("endCall", { 
      to: otherUser._id,
      from: currentUser._id 
    });
    console.log("✅ endCall event emitted to backend");
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (peerRef.current && !peerRef.current.destroyed) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    
    setCallDuration(0);
    setCallStartTime(null);
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
