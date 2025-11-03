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
          
          // CONTINUOUS audio level monitoring (checks every second for 10 seconds)
          let checkCount = 0;
          const maxChecks = 10;
          const audioCheckInterval = setInterval(() => {
            checkCount++;
            try {
              if (window.AudioContext && !track.muted && track.readyState === 'live') {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const streamNode = audioContext.createMediaStreamSource(new MediaStream([track]));
                const analyser = audioContext.createAnalyser();
                streamNode.connect(analyser);
                analyser.fftSize = 256;
                const dataArray = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
                
                console.log(`🎤 [Check ${checkCount}/${maxChecks}] YOUR MIC audio level:`, average.toFixed(2), average > 0 ? '✅ (picking up sound!)' : '❌ (silence)');
                
                if (checkCount === 1 && average === 0) {
                  console.warn('⚠️ No audio detected yet. SPEAK INTO YOUR MIC NOW to test!');
                }
                
                if (average > 0) {
                  console.log('✅✅✅ MICROPHONE IS WORKING! Audio data detected!');
                  clearInterval(audioCheckInterval);
                }
                
                if (checkCount >= maxChecks && average === 0) {
                  console.error('❌❌❌ MICROPHONE PROBLEM: No audio detected after 10 checks!');
                  console.error('❌ Your microphone is not sending any audio data.');
                  console.error('❌ Check:');
                  console.error('   1. Windows Sound Settings → Input → Microphone volume is UP');
                  console.error('   2. Browser has microphone permission');
                  console.error('   3. Microphone is not muted in system settings');
                  console.error('   4. Try a different microphone/device');
                  clearInterval(audioCheckInterval);
                }
                
                // Clean up
                streamNode.disconnect();
                audioContext.close();
              } else {
                console.warn(`⚠️ Track not ready: muted=${track.muted}, state=${track.readyState}`);
                if (checkCount >= maxChecks) clearInterval(audioCheckInterval);
              }
            } catch (e) {
              console.error('❌ Error measuring audio level:', e.message);
              if (checkCount >= maxChecks) clearInterval(audioCheckInterval);
            }
          }, 1000);
        });
        
        if (myVideo.current) {
          myVideo.current.srcObject = stream;
          console.log("📹 Local stream attached to myVideo element");
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
                  
                  // CRITICAL: Restart playback when track unmutes
                  if (otherVideo.current && otherVideo.current.paused) {
                    console.log('🔄 Restarting audio playback after unmute...');
                    otherVideo.current.play().catch(err => {
                      console.error('❌ Failed to restart playback:', err);
                    });
                  } else {
                    console.log('🔄 Audio element is already playing, ensuring it processes the unmuted track...');
                    // Force a reload of the stream
                    const currentStream = otherVideo.current.srcObject;
                    otherVideo.current.srcObject = null;
                    setTimeout(() => {
                      if (otherVideo.current) {
                        otherVideo.current.srcObject = currentStream;
                        otherVideo.current.play().then(() => {
                          console.log('✅ Audio reloaded and playing after unmute');
                        }).catch(err => {
                          console.error('❌ Failed to reload audio:', err);
                        });
                      }
                    }, 100);
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
              
              otherVideo.current.srcObject = remoteStream;
              const mediaEl = otherVideo.current;
              
              // Ensure audio is enabled and volume is up
              if (mediaEl.tagName === 'AUDIO') {
                mediaEl.volume = 1.0;
                mediaEl.muted = false;
                console.log('🔊 Audio element configured: volume=1.0, muted=false');
              }
              
              const safePlay = async () => {
                // Resume AudioContext if needed (required by some browsers)
                try {
                  if (typeof window !== 'undefined' && window.AudioContext) {
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    if (audioContext.state === 'suspended') {
                      await audioContext.resume();
                      console.log('🔊 AudioContext resumed');
                    }
                  }
                } catch (e) {
                  console.warn('⚠️ AudioContext warning:', e);
                }
                
                // Check audio output device
                if (mediaEl.setSinkId) {
                  try {
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
                    console.log('🔊 Available audio outputs:', audioOutputs.length);
                    console.log('🔊 Current sink ID:', mediaEl.sinkId || '(default)');
                  } catch (e) {
                    console.warn('⚠️ Could not enumerate devices:', e);
                  }
                } else {
                  console.warn('⚠️ setSinkId not supported - cannot check audio output device');
                }
                
                const playPromise = mediaEl.play();
                if (playPromise && typeof playPromise.then === 'function') {
                  playPromise.then(() => {
                    console.log('✅ Media playback started successfully');
                    if (mediaEl.tagName === 'AUDIO') {
                      console.log('🔊 Audio playing, volume:', mediaEl.volume, 'muted:', mediaEl.muted);
                      setAudioUnlocked(true);
                      
                      // CONTINUOUS diagnostic: Check remote audio is flowing (every second for 10 seconds)
                      let remoteCheckCount = 0;
                      const maxRemoteChecks = 10;
                      const remoteAudioCheckInterval = setInterval(() => {
                        remoteCheckCount++;
                        
                        if (remoteCheckCount === 1) {
                          console.log('🔊 REMOTE AUDIO DIAGNOSTIC:');
                          console.log('  - paused:', mediaEl.paused);
                          console.log('  - currentTime:', mediaEl.currentTime);
                          console.log('  - volume:', mediaEl.volume);
                          console.log('  - muted:', mediaEl.muted);
                          console.log('  - readyState:', mediaEl.readyState);
                        }
                        
                        const stream = mediaEl.srcObject;
                        if (stream) {
                          const audioTracks = stream.getAudioTracks();
                          audioTracks.forEach((track, i) => {
                            // Try to check if audio is actually flowing using Web Audio API
                            try {
                              if (window.AudioContext && !track.muted && track.readyState === 'live') {
                                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                                const streamNode = audioContext.createMediaStreamSource(new MediaStream([track]));
                                const analyser = audioContext.createAnalyser();
                                streamNode.connect(analyser);
                                analyser.fftSize = 256;
                                const dataArray = new Uint8Array(analyser.frequencyBinCount);
                                analyser.getByteFrequencyData(dataArray);
                                const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
                                
                                console.log(`🔊 [Check ${remoteCheckCount}/${maxRemoteChecks}] REMOTE audio level:`, average.toFixed(2), average > 0 ? '✅ (receiving audio!)' : '❌ (silence)');
                                
                                if (remoteCheckCount === 1 && average === 0) {
                                  console.warn('⚠️ No remote audio yet. Ask the OTHER PERSON to SPEAK NOW!');
                                }
                                
                                if (average > 0) {
                                  console.log('✅✅✅ REMOTE AUDIO IS WORKING! You should hear them now!');
                                  clearInterval(remoteAudioCheckInterval);
                                }
                                
                                if (remoteCheckCount >= maxRemoteChecks && average === 0) {
                                  console.error('❌❌❌ REMOTE AUDIO PROBLEM: No audio from other person!');
                                  console.error('❌ The other person\'s microphone is not sending audio.');
                                  console.error('❌ Ask them to check their microphone settings!');
                                  clearInterval(remoteAudioCheckInterval);
                                }
                                
                                // Clean up
                                streamNode.disconnect();
                                audioContext.close();
                              }
                            } catch (e) {
                              console.warn('⚠️ Could not measure remote audio level:', e.message);
                              if (remoteCheckCount >= maxRemoteChecks) clearInterval(remoteAudioCheckInterval);
                            }
                          });
                        }
                        
                        if (remoteCheckCount >= maxRemoteChecks) {
                          clearInterval(remoteAudioCheckInterval);
                        }
                      }, 1000);
                    }
                  }).catch(err => {
                    if (err && (err.name === 'AbortError' || err.message?.includes('interrupted'))) {
                      console.warn('⚠️ Media play interrupted, retrying shortly...');
                      setTimeout(() => {
                        mediaEl.play().then(() => setAudioUnlocked(true)).catch(() => {});
                      }, 150);
                    } else {
                      console.error('❌ Play error:', err.name, err.message);
                      console.log('💡 Browser blocked autoplay. User needs to click to enable audio.');
                      // Don't set audioUnlocked - we'll show a button
                    }
                  });
                }
              };
              
              if (mediaEl.readyState >= 2) {
                safePlay();
              } else {
                const onLoaded = () => {
                  mediaEl.removeEventListener('loadedmetadata', onLoaded);
                  console.log('📺 Media metadata loaded, starting playback');
                  safePlay();
                };
                mediaEl.addEventListener('loadedmetadata', onLoaded);
              }
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

  const unlockAudio = async () => {
    console.log('🔓 Unlocking audio playback...');
    if (otherVideo.current) {
      try {
        // Resume AudioContext (required by some browsers)
        try {
          if (typeof window !== 'undefined' && window.AudioContext) {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (audioContext.state === 'suspended') {
              await audioContext.resume();
              console.log('🔊 AudioContext resumed');
            }
            console.log('🔊 AudioContext state:', audioContext.state);
          }
        } catch (e) {
          console.warn('⚠️ AudioContext warning:', e);
        }
        
        // Force audio settings before playing
        otherVideo.current.muted = false;
        otherVideo.current.volume = 1.0;
        
        // Check if srcObject has audio tracks
        if (otherVideo.current.srcObject) {
          const audioTracks = otherVideo.current.srcObject.getAudioTracks();
          console.log('🔊 Audio tracks in element:', audioTracks.length);
          audioTracks.forEach((track, idx) => {
            track.enabled = true;
            console.log(`🔊 Track ${idx}:`, {
              enabled: track.enabled,
              muted: track.muted,
              readyState: track.readyState
            });
          });
        } else {
          console.error('❌ No srcObject on audio element!');
        }
        
        await otherVideo.current.play();
        setAudioUnlocked(true);
        console.log('✅ Audio unlocked and playing!');
        
        // Log current state
        if (otherVideo.current.tagName === 'AUDIO') {
          console.log('🔊 Audio state after unlock:', {
            volume: otherVideo.current.volume,
            muted: otherVideo.current.muted,
            paused: otherVideo.current.paused,
            readyState: otherVideo.current.readyState,
            currentTime: otherVideo.current.currentTime,
            duration: otherVideo.current.duration
          });
        }
      } catch (err) {
        console.error('❌ Failed to unlock audio:', err);
        alert('Could not start audio playback. Please check your browser settings.');
      }
    } else {
      console.error('❌ otherVideo ref is null!');
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
              
              {/* Enable Audio Button - shows when browser blocks autoplay */}
              {callStatus === "active" && !audioUnlocked && (
                <button
                  onClick={unlockAudio}
                  className="mt-6 bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg animate-pulse"
                >
                  🔊 Tap to Enable Audio
                </button>
              )}
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