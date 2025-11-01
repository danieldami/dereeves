/**
 * WebRTC Calling Diagnostic Script
 * Run this in your browser console while testing calls
 */

console.log("🔍 ========== WEBRTC CALL DIAGNOSTICS ==========");

// Check environment variables
console.log("\n📋 1. Environment Configuration:");
console.log("TURN URL:", process.env.NEXT_PUBLIC_TURN_URL || "❌ NOT SET");
console.log("TURN Username:", process.env.NEXT_PUBLIC_TURN_USERNAME || "❌ NOT SET");
console.log("TURN Credential:", process.env.NEXT_PUBLIC_TURN_CREDENTIAL ? "✅ SET" : "❌ NOT SET");

// Check WebRTC support
console.log("\n📋 2. Browser WebRTC Support:");
console.log("getUserMedia:", navigator.mediaDevices && navigator.mediaDevices.getUserMedia ? "✅ Supported" : "❌ Not Supported");
console.log("RTCPeerConnection:", typeof RTCPeerConnection !== 'undefined' ? "✅ Supported" : "❌ Not Supported");
console.log("Protocol:", window.location.protocol);
console.log("⚠️ Note: WebRTC requires HTTPS (except on localhost)");

// Check socket connection
console.log("\n📋 3. Socket.IO Connection:");
const checkSocket = () => {
  if (typeof socket !== 'undefined') {
    console.log("Socket Connected:", socket.connected ? "✅ Yes" : "❌ No");
    console.log("Socket ID:", socket.id || "❌ Not available");
    console.log("Socket URL:", socket.io.uri);
  } else {
    console.log("❌ Socket not available in window scope");
  }
};
setTimeout(checkSocket, 100);

// Test STUN/TURN servers
console.log("\n📋 4. Testing ICE Servers...");
const testICEServers = async () => {
  const iceServers = [
    { urls: "stun:stun.l.google.com:19302" }
  ];
  
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  const turnUser = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCred = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;
  
  if (turnUrl && turnUser && turnCred) {
    iceServers.push({ 
      urls: turnUrl, 
      username: turnUser, 
      credential: turnCred 
    });
    console.log("✅ TURN server configured");
  } else {
    console.warn("⚠️ TURN server NOT configured - calls may fail behind NATs/firewalls");
  }
  
  try {
    const pc = new RTCPeerConnection({ iceServers });
    
    console.log("Testing ICE candidate gathering...");
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const type = event.candidate.type;
        console.log(`🧊 ICE Candidate found: ${type}`);
        
        if (type === 'relay') {
          console.log("✅ TURN relay candidate found - TURN is working!");
        } else if (type === 'srflx') {
          console.log("✅ STUN reflexive candidate found - STUN is working!");
        } else if (type === 'host') {
          console.log("✅ Host candidate found");
        }
      } else {
        console.log("🧊 ICE gathering complete");
        pc.close();
      }
    };
    
    // Create a dummy data channel to trigger ICE gathering
    pc.createDataChannel('test');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    setTimeout(() => {
      pc.close();
      console.log("✅ ICE test complete");
    }, 5000);
    
  } catch (error) {
    console.error("❌ ICE server test failed:", error);
  }
};

testICEServers();

// Monitor for call-related events
console.log("\n📋 5. Monitoring Call Events...");
console.log("Watch this console for call events when you initiate a call");
console.log("Expected events:");
console.log("  📞 callUser (outgoing)");
console.log("  📞 incomingCall (incoming)");
console.log("  ✅ callAccepted");
console.log("  🌐 ICE state changes");
console.log("  🧊 ICE candidates");

console.log("\n🔍 ========== DIAGNOSTIC COMPLETE ==========");
console.log("\nIf you see issues, check:");
console.log("1. Is TURN configured in frontend/.env.local?");
console.log("2. Is your socket connected?");
console.log("3. Are both users registered and online?");
console.log("4. Check browser console for specific errors during calls");

