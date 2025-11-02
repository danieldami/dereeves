"use client";
import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";

// Mock Peer and socket for demo - replace with actual imports
const Peer = null;
const socket = { emit: () => {}, on: () => {}, off: () => {} };

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

        const iceServers = [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
          { urls: "stun:stun3.l.google.com:19302" },
          { urls: "stun:stun4.l.google.com:19302" }
        ];
        
        const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
        const turnUser = process.env.NEXT_PUBLIC_TURN_USERNAME;
        const turnCred = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;
        
        if (turnUrl && turnUser && turnCred) {
          console.log("🧭 Using TURN server from env:", turnUrl);
          iceServers.push(
            { 
              urls: turnUrl, 
              username: turnUser, 
              credential: turnCred 
            }
          );
          
          if (turnUrl.includes(':80') || turnUrl.includes(':3478')) {
            const tcpTurnUrl = turnUrl.replace(':80', ':443').replace(':3478', ':5349');
            if (tcpTurnUrl !== turnUrl) {
              iceServers.push(
                { 
                  urls: tcpTurnUrl, 
                  username: turnUser, 
                  credential: turnCred 
                }
              );
              console.log("🧭 Also using TCP TURN server:", tcpTurnUrl);
            }
          }
        } else {
          console.warn("⚠️ No TURN credentials provided. Using STUN only.");
        }

        if (!Peer) {
          console.warn("Peer not available in demo");
          return;
        }

        const peer = new Peer({
          initiator: isInitiator,
          trickle: true,
          stream: stream,
          config: {
            iceServers
          }
        });

        peerRef.current = peer;

        try {
          const pc = peer._pc;
          if (pc) {
            pc.oniceconnectionstatechange = () => {
              iceStateRef.current = pc.iceConnectionState;
              console.log("🌐 ICE state:", pc.iceConnectionState);
              
              if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
                console.log("✅ ICE connection established successfully!");
                callActiveRef.current = true;
                setCallStatus("active");
                
                if (connectionTimeoutRef.current) {
                  clearTimeout(connectionTimeoutRef.current);
                  connectionTimeoutRef.current = null;
                  console.log("✅ Connection timeout cleared - call is active");
                }
                
                if (!callStartTime) {
                  setCallStartTime(Date.now());
                }
              }
              
              if (pc.iceConnectionState === "failed") {
                console.error("❌ ICE connection failed - connection cannot be established");
              } else if (pc.iceConnectionState === "disconnected") {
                console.warn("⚠️ ICE connection disconnected - may reconnect automatically");
              }
            };
            
            pc.onicegatheringstatechange = () => {
              console.log("🧊 ICE gathering state:", pc.iceGatheringState);
            };
            
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
          callActiveRef.current = true;
          setCallStatus("active");
          setRemoteStreamReceived(true);
          
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
            console.log("✅ Connection timeout cleared - stream received");
          }
          
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
          
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
            console.log("✅ Connection timeout cleared - peer connected");
          }
          
          if (!callStartTime) {
            setCallStartTime(Date.now());
          }
        });

        peer.on("error", (err) => {
          if (err.message && err.message.includes("stable") && err.message.includes("setRemoteDescription")) {
            console.log("⚠️ Ignoring SDP stable state error - this is usually a harmless duplicate signal");
            return;
          }
          
          console.error("❌ ========== PEER ERROR ==========");
          console.error("❌ Error:", err);
          
          if (err.message && err.message.includes("setRemoteDescription")) {
            console.error("❌ SDP State Error - attempting to recover...");
            setTimeout(() => {
              if (peerRef.current && !peerRef.current.destroyed) {
                console.log("🔄 Attempting to recreate peer...");
                peerRef.current.destroy();
              }
            }, 1000);
            return;
          }
          
          const isTransient = (
            err.type === 'connection-closed' ||
            err.code === 'CONNECTION_CLOSED' ||
            err.code === 'ERR_CONNECTION_FAILURE' ||
            err.message === 'Connection failed'
          );

          if (isTransient) {
            console.log("🔌 Transient connection error - waiting for retry/timeout");
            if (!retriedRef.current && peerRef.current && !peerRef.current.destroyed) {
              retriedRef.current = true;
              console.log("🔁 Attempting one-time peer retry...");
              try {
                peerRef.current.destroy();
              } catch (_) {}
              setTimeout(() => {
                if (isOpen) {
                  setCallStatus(prev => prev === 'connecting' ? 'ringing' : 'connecting');
                }
              }, 200);
            }
            return;
          }

          alert(`Call error: ${err.message}`);
          if (callStatus === "active") {
            setCallStatus("ended");
            setTimeout(() => endCall(), 1000);
          }
        });

        peer.on("close", () => {
          console.log("🔴 Peer connection closed");
          if (callStatus !== "ended") {
            setCallStatus("ended");
          }
        });

        if (!isInitiator && incomingSignal) {
          console.log("🔥 RECEIVER: Signaling peer with incoming signal");
          requestAnimationFrame(() => {
            if (peerRef.current && !peerRef.current.destroyed) {
              console.log("🔥 Processing incoming signal...");
              try {
                peer.signal(incomingSignal);
                console.log("✅ Incoming signal processed successfully");
              } catch (error) {
                console.error("❌ Error processing incoming signal:", error);
              }
            }
          });
        }

        connectionTimeoutRef.current = setTimeout(() => {
          if (!callActiveRef.current) {
            console.warn('⏰ Connection not established in time - ending call');
            
            let errorMsg = 'Connection failed to establish. Please try again.';
            if (iceStateRef.current === 'failed' || iceStateRef.current === 'disconnected') {
              errorMsg += '\n\nPossible causes:\n• Network/firewall restrictions\n• Both users behind restrictive NAT\n• TURN server needed for connection';
            }
            
            alert(errorMsg);
            endCall();
          }
        }, 30000);

        const handleCallAccepted = ({ signal }) => {
          console.log("✅ ========== CALL ACCEPTED ==========");
          setCallStatus("connecting");
          
          if (peerRef.current && !peerRef.current.destroyed) {
            try {
              if (signal) {
                peerRef.current.signal(signal);
                console.log("✅ Answer signal processed successfully");
                setCallStartTime(Date.now());
              }
            } catch (error) {
              console.error("❌ Error signaling peer:", error);
              if (error.message && error.message.includes("stable")) {
                if (!callStartTime) {
                  setCallStartTime(Date.now());
                }
              }
            }
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
            return;
          }
          
          console.log("🔴 ========== CALL ENDED BY OTHER USER ==========");
          isEndingCallRef.current = true;
          setCallStatus("ended");
          
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
          }
          
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
          if (peerRef.current && !peerRef.current.destroyed) {
            peerRef.current.destroy();
            peerRef.current = null;
          }
          
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

        if (isInitiator) {
          socket.on("callAccepted", handleCallAccepted);
          socket.on("callRejected", handleCallRejected);
          socket.on("callTimeout", handleCallTimeout);
          socket.on("callError", handleCallError);
        }
        
        socket.on("callEnded", handleCallEnded);

        return () => {
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
          }
          
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
      return;
    }
    
    console.log("📴 Ending call...");
    isEndingCallRef.current = true;
    
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    
    socket.emit("endCall", { 
      to: otherUser._id,
      from: currentUser._id 
    });
    
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
    <div className="fixed inset-0 bg-gradient-to-b from-blue-500 to-blue-600 flex items-center justify-center z-50">
      <div className="w-full h-full flex flex-col">
        {/* Video container - full screen */}
        <div className="flex-1 relative">
          {callType === "video" ? (
            <>
              {/* Remote video - full screen */}
              <video
                ref={otherVideo}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              
              {/* Local video - small corner */}
              <div className="absolute top-6 right-6 w-28 h-40 bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
                <video
                  ref={myVideo}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            </>
          ) : (
            /* Audio call view */
            <div className="w-full h-full flex flex-col items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center mb-8">
                <div className="w-28 h-28 rounded-full bg-white/30 flex items-center justify-center">
                  <span className="text-6xl text-white font-semibold">
                    {otherUser?.name?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Status overlay - top center */}
          <div className="absolute top-0 left-0 right-0 pt-12 flex flex-col items-center">
            <h2 className="text-white text-2xl font-medium mb-1">
              {otherUser?.name || "Unknown"}
            </h2>
            <p className="text-white/80 text-base">
              {callStatus === "ringing" && "Ringing…"}
              {callStatus === "connecting" && "Connecting…"}
              {callStatus === "active" && callDuration > 0 && formatDuration(callDuration)}
              {callStatus === "ended" && "Call ended"}
            </p>
          </div>
        </div>

        {/* Controls - bottom */}
        <div className="pb-12 pt-6 px-6">
          <div className="flex items-center justify-center gap-6">
            {/* Mute button */}
            <button
              onClick={toggleMute}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                isMuted 
                  ? "bg-white/20 backdrop-blur-sm" 
                  : "bg-white/30 backdrop-blur-sm"
              }`}
            >
              {isMuted ? (
                <MicOff className="w-7 h-7 text-white" strokeWidth={2.5} />
              ) : (
                <Mic className="w-7 h-7 text-white" strokeWidth={2.5} />
              )}
            </button>

            {/* End call button */}
            <button
              onClick={endCall}
              className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center transition-all hover:bg-red-600 shadow-lg"
            >
              <PhoneOff className="w-7 h-7 text-white" strokeWidth={2.5} />
            </button>

            {/* Video toggle button */}
            {callType === "video" && (
              <button
                onClick={toggleVideo}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                  isVideoOff 
                    ? "bg-white/20 backdrop-blur-sm" 
                    : "bg-white/30 backdrop-blur-sm"
                }`}
              >
                {isVideoOff ? (
                  <VideoOff className="w-7 h-7 text-white" strokeWidth={2.5} />
                ) : (
                  <Video className="w-7 h-7 text-white" strokeWidth={2.5} />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}