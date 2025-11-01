#!/bin/bash

# Production Deployment Script for TURN Configuration
# Run this script on your VPS

echo "=========================================="
echo "  Deploying TURN Configuration to VPS"
echo "=========================================="
echo ""

# Navigate to project
cd ~/dereeves || { echo "❌ Project directory not found"; exit 1; }

echo "📥 Pulling latest code..."
git pull

echo ""
echo "📝 Creating frontend/.env.local with TURN configuration..."
cd frontend

# Create .env.local file
cat > .env.local << 'EOF'
NEXT_PUBLIC_TURN_URL=turn:openrelay.metered.ca:80
NEXT_PUBLIC_TURN_USERNAME=openrelayproject
NEXT_PUBLIC_TURN_CREDENTIAL=openrelayproject
EOF

echo "✅ .env.local created"
echo ""

echo "📦 Contents of .env.local:"
cat .env.local
echo ""

echo "🔨 Rebuilding frontend (this may take a few minutes)..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed! Check errors above."
    exit 1
fi

echo ""
echo "🔄 Restarting frontend service..."

# Try different restart methods
if command -v pm2 &> /dev/null; then
    pm2 restart frontend
    echo "✅ Frontend restarted with pm2"
    echo ""
    echo "📊 PM2 Status:"
    pm2 status
    echo ""
    echo "📋 Recent logs:"
    pm2 logs frontend --lines 20 --nostream
elif systemctl is-active --quiet dereeves-frontend; then
    sudo systemctl restart dereeves-frontend
    echo "✅ Frontend restarted with systemctl"
    sudo systemctl status dereeves-frontend
else
    echo "⚠️ Could not detect service manager. Please restart manually."
fi

echo ""
echo "=========================================="
echo "  ✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "🧪 Test your calls now at:"
echo "   https://dereevesfoundations.com"
echo ""
echo "👀 Watch for these logs in browser console:"
echo "   🧭 Using TURN server from env: turn:openrelay.metered.ca:80"
echo "   🧊 ICE candidate: relay"
echo "   📡 ========== PEER SIGNAL GENERATED =========="
echo "   📞 CALLER: Emitting callUser"
echo ""

