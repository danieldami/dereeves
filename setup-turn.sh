#!/bin/bash

# WebRTC TURN Server Setup Script
# This script helps you quickly configure a TURN server for your video calling app

echo "🎥 WebRTC TURN Server Setup"
echo "============================"
echo ""

# Check if frontend/.env.local already exists
if [ -f "frontend/.env.local" ]; then
    echo "⚠️  frontend/.env.local already exists!"
    echo ""
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Setup cancelled."
        exit 1
    fi
fi

echo ""
echo "Choose a TURN server option:"
echo ""
echo "1. Free Public TURN (OpenRelay) - Good for testing"
echo "2. Xirsys - Enter your credentials"
echo "3. Twilio - Enter your credentials"
echo "4. Custom TURN server"
echo ""
read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo "📡 Configuring OpenRelay (free public TURN server)..."
        cat > frontend/.env.local << EOF
# Free public TURN server for testing
# Note: This server has limited capacity and may not always work
# For production, use Xirsys or Twilio
NEXT_PUBLIC_TURN_URL=turn:openrelay.metered.ca:80
NEXT_PUBLIC_TURN_USERNAME=openrelayproject
NEXT_PUBLIC_TURN_CREDENTIAL=openrelayproject
EOF
        echo "✅ Configuration saved!"
        ;;
    
    2)
        echo ""
        echo "📡 Xirsys TURN Server Configuration"
        echo "Get your credentials from: https://xirsys.com/dashboard"
        echo ""
        read -p "Enter TURN URL (e.g., turn:your-server.xirsys.com:3478): " turn_url
        read -p "Enter Username: " username
        read -p "Enter Credential: " credential
        
        cat > frontend/.env.local << EOF
# Xirsys TURN Server Configuration
NEXT_PUBLIC_TURN_URL=$turn_url
NEXT_PUBLIC_TURN_USERNAME=$username
NEXT_PUBLIC_TURN_CREDENTIAL=$credential
EOF
        echo "✅ Configuration saved!"
        ;;
    
    3)
        echo ""
        echo "📡 Twilio TURN Server Configuration"
        echo "Get your credentials from: https://www.twilio.com/console/voice/sdks/turn-credentials"
        echo ""
        read -p "Enter TURN URL (e.g., turn:global.turn.twilio.com:3478): " turn_url
        read -p "Enter Username: " username
        read -p "Enter Credential: " credential
        
        cat > frontend/.env.local << EOF
# Twilio TURN Server Configuration
NEXT_PUBLIC_TURN_URL=$turn_url
NEXT_PUBLIC_TURN_USERNAME=$username
NEXT_PUBLIC_TURN_CREDENTIAL=$credential
EOF
        echo "✅ Configuration saved!"
        ;;
    
    4)
        echo ""
        echo "📡 Custom TURN Server Configuration"
        echo ""
        read -p "Enter TURN URL (e.g., turn:your-server.com:3478): " turn_url
        read -p "Enter Username: " username
        read -p "Enter Credential: " credential
        
        cat > frontend/.env.local << EOF
# Custom TURN Server Configuration
NEXT_PUBLIC_TURN_URL=$turn_url
NEXT_PUBLIC_TURN_USERNAME=$username
NEXT_PUBLIC_TURN_CREDENTIAL=$credential
EOF
        echo "✅ Configuration saved!"
        ;;
    
    *)
        echo "❌ Invalid choice. Setup cancelled."
        exit 1
        ;;
esac

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Restart your frontend server:"
echo "   cd frontend && npm run dev"
echo ""
echo "2. Test your configuration:"
echo "   - Open browser console (F12)"
echo "   - Make a video call"
echo "   - Look for: '🧭 Using TURN server from env'"
echo "   - Look for: '🧊 ICE candidate: relay'"
echo ""
echo "3. If issues persist, read WEBRTC_TROUBLESHOOTING.md"
echo ""
echo "Happy calling! 📞✨"

