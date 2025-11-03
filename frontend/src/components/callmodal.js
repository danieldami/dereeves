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
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [micLevel, setMicLevel] = useState(0);

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
  const audioContextRef = useRef(null);
  const audioSourceRef = useRef(null);
  const gainNodeRef = useRef(null);

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
          audio: true  // SIMPLIFIED: Just request audio without constraints
        });

        console.log("✅ Media stream obtained:", stream.getTracks().map(t => t.kind));
        
        // Log detailed track info and ENSURE AUDIO IS ENABLED
        stream.getTracks().forEach(track => {
          // Explicitly enable all tracks
          track.enabled = true;
          console.log(`📊 LOCAL Track ${track.kind}:`, {
            id: track.id,
            label: track.label,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState
          });
          
          // WARNING: Check for virtual audio devices that might cause issues
          if (track.kind === 'audio' && track.label) {
            if (track.label.includes('Voicemod') || track.label.includes('Virtual Audio')) {
              console.warn('⚠️ Virtual audio device detected (Voicemod, etc.)');
              console.warn('⚠️ If audio doesn\'t work, try using your real microphone instead.');
            }
          }
          
          // WARNING: If muted is true, the microphone hardware/OS is muting it
          if (track.kind === 'audio' && track.muted) {
            console.error('❌ WARNING: Your microphone is MUTED at the hardware/OS level!');
            console.error('❌ Please check your system microphone settings or browser permissions.');
          }
        });
        
        streamRef.current = stream;
        
        // Double-check audio tracks are enabled and working
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
          console.error("❌ NO AUDIO TRACKS IN LOCAL STREAM!");
          alert("Microphone is not working. Please check permissions.");
          onClose();
          return;
        }
        console.log(`✅ ${audioTracks.length} audio track(s) confirmed in local stream`);
        
        // Monitor the local audio track for mute changes
        audioTracks.forEach((track, idx) => {
          track.onmute = () => {
            console.error(`❌ Local audio track ${idx} was MUTED! Check your microphone.`);
          };
          track.onunmute = () => {
            console.log(`✅ Local audio track ${idx} was UNMUTED.`);
          };
          track.onended = () => {
            console.warn(`⚠️ Local audio track ${idx} ENDED.`);
          };
          
          // Simple track monitoring (just log the state)
          console.log(`🎤 Local audio track ${idx} info:`, {
            id: track.id,
            label: track.label,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState
          });
        });
        
        if (myVideo.current) {
          myVideo.current.srcObject = stream;
          console.log("📹 Local stream attached to myVideo element");
        }
        
        // CONTINUOUS microphone level monitoring
        try {
          if (window.AudioContext && stream) {
            const monitorContext = new (window.AudioContext || window.webkitAudioContext)();
            const monitorSource = monitorContext.createMediaStreamSource(stream);
            const analyser = monitorContext.createAnalyser();
            analyser.fftSize = 256;
            monitorSource.connect(analyser);
            
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            
            // Update mic level every 100ms
            const micMonitor = setInterval(() => {
              analyser.getByteFrequencyData(dataArray);
              const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
              setMicLevel(Math.round(average));
              
              if (average > 0) {
                console.log('🎤 YOUR MIC IS PICKING UP AUDIO! Level:', Math.round(average));
              }
            }, 100);
            
            // Clean up after 30 seconds
            setTimeout(() => {
              clearInterval(micMonitor);
              monitorSource.disconnect();
              analyser.disconnect();
              monitorContext.close();
            }, 30000);
            
            console.log('🎤 Microphone monitoring started. Speak into your mic - watch the level indicator on screen!');
          }
        } catch (e) {
          console.error('❌ Mic monitoring failed:', e);
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
              // CRITICAL: Enable AND monitor all audio tracks in the remote stream
              const audioTracks = remoteStream.getAudioTracks();
              console.log('🔊 Remote audio tracks:', audioTracks.length);
              audioTracks.forEach((track, idx) => {
                console.log(`🔊 Remote audio track ${idx} INITIAL STATE:`, {
                  enabled: track.enabled,
                  muted: track.muted,
                  readyState: track.readyState,
                  label: track.label
                });
                
                track.enabled = true; // Explicitly enable
                
                // Monitor remote track for mute/unmute events
                track.onmute = () => {
                  console.error(`❌ REMOTE audio track ${idx} was MUTED! (sender's mic is muted)`);
                };
                track.onunmute = () => {
                  console.log(`✅ REMOTE audio track ${idx} was UNMUTED! (sender's mic is active)`);
                  console.log('🔄 RECREATING Web Audio routing with unmuted track...');
                  
                  // CRITICAL: Recreate Web Audio routing now that track is unmuted
                  try {
                    // Disconnect old routing
                    if (audioSourceRef.current) {
                      audioSourceRef.current.disconnect();
                    }
                    if (gainNodeRef.current) {
                      gainNodeRef.current.disconnect();
                    }
                    
                    // Create NEW routing with the unmuted stream
                    if (audioContextRef.current && remoteStream) {
                      audioSourceRef.current = audioContextRef.current.createMediaStreamSource(remoteStream);
                      gainNodeRef.current = audioContextRef.current.createGain();
                      gainNodeRef.current.gain.value = 2.0;
                      
                      audioSourceRef.current.connect(gainNodeRef.current);
                      gainNodeRef.current.connect(audioContextRef.current.destination);
                      
                      console.log('✅✅✅ AUDIO ROUTING RECREATED! You should hear them NOW!');
                    }
                  } catch (e) {
                    console.error('❌ Failed to recreate audio routing:', e);
                  }
                };
                track.onended = () => {
                  console.warn(`⚠️ REMOTE audio track ${idx} ENDED.`);
                };
                
                // CRITICAL: If track is muted, warn the user
                if (track.muted) {
                  console.error('❌ Remote track is muted! The other person\'s microphone might be muted or not working.');
                  console.error('❌ Ask the other person to check their microphone permissions and hardware mute button.');
                }
                
                console.log(`🔊 Remote audio track ${idx} FINAL STATE:`, {
                  enabled: track.enabled,
                  muted: track.muted,
                  readyState: track.readyState
                });
              });
              
              // CRITICAL: Use Web Audio API ONLY (not HTML audio element)
              const setupWebAudioPlayback = async () => {
                try {
                  if (typeof window !== 'undefined' && window.AudioContext && remoteStream) {
                    console.log('🔊 Setting up Web Audio API for direct speaker output...');
                    
                    // Create or reuse AudioContext
                    if (!audioContextRef.current) {
                      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
                      console.log('🔊 New AudioContext created');
                    }
                    
                    const audioContext = audioContextRef.current;
                    
                    if (audioContext.state === 'suspended') {
                      await audioContext.resume();
                      console.log('🔊 AudioContext resumed');
                    }
                    
                    // Clean up old connections if they exist
                    if (audioSourceRef.current) {
                      try {
                        audioSourceRef.current.disconnect();
                      } catch (e) {}
                    }
                    if (gainNodeRef.current) {
                      try {
                        gainNodeRef.current.disconnect();
                      } catch (e) {}
                    }
                    
                    // Create source from the ACTUAL remote stream
                    audioSourceRef.current = audioContext.createMediaStreamSource(remoteStream);
                    
                    // Create gain node for volume control
                    gainNodeRef.current = audioContext.createGain ? audioContext.createGain() : audioContext.createGainNode();
                    gainNodeRef.current.gain.value = 2.0; // Boost volume to 200% for testing
                    
                    // Connect: source -> gain -> destination (speakers)
                    audioSourceRef.current.connect(gainNodeRef.current);
                    gainNodeRef.current.connect(audioContext.destination);
                    
                    console.log('✅✅✅ DIRECT AUDIO ROUTING: RemoteStream -> Gain(2.0x) -> Your Speakers');
                    console.log('🔊 AudioContext state:', audioContext.state);
                    console.log('🔊 Audio should now be playing directly to your speakers!');
                    
                    // Test if speakers are working by playing a brief test tone
                    try {
                      const oscillator = audioContext.createOscillator();
                      const testGain = audioContext.createGain();
                      oscillator.frequency.value = 440; // A4 note
                      testGain.gain.value = 0.1; // Quiet test tone
                      oscillator.connect(testGain);
                      testGain.connect(audioContext.destination);
                      oscillator.start();
                      setTimeout(() => {
                        oscillator.stop();
                        console.log('🔊 Test tone completed. Did you hear a brief beep? If YES, your speakers work!');
                      }, 200);
                    } catch (e) {
                      console.warn('⚠️ Could not play test tone:', e);
                    }
                    
                    setAudioUnlocked(true);
                  }
                } catch (e) {
                  console.error('❌ Web Audio setup failed:', e);
                }
              };
              
              // Call the Web Audio setup immediately
              setupWebAudioPlayback();
            } catch (e) {
              console.error('❌ Error attaching remote stream:', e);
            }
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
      
      // Clean up Web Audio routing
      if (audioSourceRef.current) {
        try {
          audioSourceRef.current.disconnect();
          audioSourceRef.current = null;
          console.log("🧹 Audio source disconnected");
        } catch (e) {}
      }
      if (gainNodeRef.current) {
        try {
          gainNodeRef.current.disconnect();
          gainNodeRef.current = null;
          console.log("🧹 Gain node disconnected");
        } catch (e) {}
      }
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
          audioContextRef.current = null;
          console.log("🧹 AudioContext closed");
        } catch (e) {}
      }
      
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
    
    // Clean up Web Audio routing
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.disconnect();
        audioSourceRef.current = null;
      } catch (e) {}
    }
    if (gainNodeRef.current) {
      try {
        gainNodeRef.current.disconnect();
        gainNodeRef.current = null;
      } catch (e) {}
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
        audioContextRef.current = null;
      } catch (e) {}
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

  const unlockAudio = async () => {
    console.log('🔓 Unlocking audio playback...');
    try {
      // Resume persistent AudioContext (required by some browsers)
      if (audioContextRef.current) {
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
          console.log('🔊 AudioContext resumed from suspended state');
          setAudioUnlocked(true);
        }
        console.log('🔊 AudioContext state:', audioContextRef.current.state);
        
        // Boost volume even more
        if (gainNodeRef.current) {
          gainNodeRef.current.gain.value = 3.0;
          console.log('🔊 Volume boosted to 300% (3.0x)');
        }
      } else {
        console.error('❌ AudioContext not initialized!');
      }
    } catch (err) {
      console.error('❌ Failed to unlock audio:', err);
      alert('Could not start audio playback. Please check your browser settings.');
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
              {/* Hidden audio element for remote stream */}
              <audio
                ref={otherVideo}
                autoPlay
                playsInline
                muted={false}
                volume={1.0}
                controls={false}
                style={{ display: 'none' }}
              />
              {/* Hidden audio element for local stream (muted to prevent echo) */}
              <audio
                ref={myVideo}
                autoPlay
                muted={true}
                playsInline
                controls={false}
                style={{ display: 'none' }}
              />
              
              <div className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center mb-8">
                <div className="w-28 h-28 rounded-full bg-white/30 flex items-center justify-center">
                  <span className="text-6xl text-white font-semibold">
                    {otherUser?.name?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                </div>
              </div>
              
              {/* Microphone Level Indicator */}
              <div className="mt-6 flex flex-col items-center gap-4 w-64">
                <div className="text-white text-center">
                  <p className="text-lg font-bold mb-2">🎤 Your Mic Level:</p>
                  <div className="w-full bg-white/20 rounded-full h-8 overflow-hidden">
                    <div 
                      className="bg-green-400 h-full transition-all duration-100"
                      style={{ width: `${Math.min(micLevel * 2, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-sm mt-2">
                    {micLevel > 0 ? `✅ Mic working! (${micLevel})` : '❌ No mic input - SPEAK NOW!'}
                  </p>
                </div>
                
                {/* Enable Audio Button */}
                {(callStatus === "active" || callStatus === "connecting") && remoteStreamReceived && (
                  <div className="flex flex-col items-center gap-2">
                    <button
                      onClick={unlockAudio}
                      className="bg-red-500 hover:bg-red-600 text-white px-12 py-6 rounded-full font-bold text-2xl shadow-2xl animate-pulse z-50"
                    >
                      🔊 BOOST VOLUME
                    </button>
                    {audioUnlocked && (
                      <p className="text-white text-sm">
                        ✅ Volume at 300%
                      </p>
                    )}
                  </div>
                )}
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
                {isMuted ? "🔇" : "🎤"}
            </button>

            {/* End call button */}
            <button
              onClick={endCall}
              className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center transition-all hover:bg-red-600 shadow-lg"
            >
              ❌
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
                {isVideoOff ? "📹" : "📷"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}