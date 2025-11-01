# 🚀 Production Deployment Instructions

## Step-by-Step: Deploy TURN Configuration to VPS

### Step 1: SSH to Your VPS

```bash
ssh your-username@your-vps-ip
# or
ssh your-vps-hostname
```

### Step 2: Run These Commands

```bash
# Navigate to project
cd ~/dereeves

# Pull latest code (if you committed changes)
git pull

# Go to frontend directory
cd frontend

# Create .env.local file with TURN configuration
cat > .env.local << 'EOF'
NEXT_PUBLIC_TURN_URL=turn:openrelay.metered.ca:80
NEXT_PUBLIC_TURN_USERNAME=openrelayproject
NEXT_PUBLIC_TURN_CREDENTIAL=openrelayproject
EOF

# Verify file was created
cat .env.local

# Rebuild frontend (CRITICAL - this embeds the env vars)
npm run build

# Restart frontend
pm2 restart frontend

# Check status
pm2 status
pm2 logs frontend --lines 30
```

### Step 3: Verify Deployment

1. Open https://dereevesfoundations.com in your browser
2. Open browser console (F12)
3. Try to make a call
4. Look for these logs:

```
✅ GOOD SIGNS:
🧭 Using TURN server from env: turn:openrelay.metered.ca:80
🧊 ICE candidate: relay
📡 ========== PEER SIGNAL GENERATED ==========
📞 CALLER: Emitting callUser to: [user-id]
```

```
❌ BAD SIGNS (means rebuild didn't work):
⚠️ No TURN credentials provided. Using STUN only.
```

---

## Alternative: One-Line Deployment

Copy and paste this entire command on your VPS:

```bash
cd ~/dereeves/frontend && cat > .env.local << 'EOF'
NEXT_PUBLIC_TURN_URL=turn:openrelay.metered.ca:80
NEXT_PUBLIC_TURN_USERNAME=openrelayproject
NEXT_PUBLIC_TURN_CREDENTIAL=openrelayproject
EOF
npm run build && pm2 restart frontend && pm2 logs frontend --lines 20
```

---

## Troubleshooting

### If "pm2 restart frontend" fails:

Try finding your process:

```bash
pm2 list
```

Then restart using the actual name or ID:

```bash
pm2 restart 0     # Use the ID from pm2 list
# or
pm2 restart next  # If it's named "next"
# or
pm2 restart all   # Restart everything
```

### If using systemd instead of pm2:

```bash
sudo systemctl restart dereeves-frontend
sudo systemctl status dereeves-frontend
```

### If build fails:

```bash
# Check Node version (needs v18+)
node --version

# Clear cache and rebuild
rm -rf .next
npm run build
```

### Verify .env.local is being read:

Add this temporarily to your code to debug:

```javascript
console.log('TURN URL:', process.env.NEXT_PUBLIC_TURN_URL);
```

If it shows "undefined" after rebuild, the .env.local file wasn't picked up.

---

## Important Notes

1. **`.env.local` is NOT in git** (it's in .gitignore for security)
   - You must create it manually on the VPS
   - Don't commit TURN credentials to git

2. **MUST rebuild after creating .env.local**
   - `NEXT_PUBLIC_*` vars are embedded at build time
   - Just restarting won't work
   - You MUST run `npm run build`

3. **Free TURN server limitations**
   - OpenRelay is shared public server
   - May be slow or unavailable
   - For production, consider Xirsys or Twilio

---

## Next Steps After Deployment

1. ✅ Test calls work
2. ✅ Verify TURN relay candidates appear
3. ✅ Confirm calls connect successfully
4. 📝 Consider upgrading to paid TURN for reliability

---

## Upgrade to Better TURN Server (Optional)

### Xirsys (Recommended for Production)

1. Sign up at https://xirsys.com/
2. Create an application
3. Get your TURN credentials
4. Update `.env.local` on VPS:

```bash
cat > .env.local << 'EOF'
NEXT_PUBLIC_TURN_URL=turn:your-server.xirsys.com:3478
NEXT_PUBLIC_TURN_USERNAME=your-xirsys-username
NEXT_PUBLIC_TURN_CREDENTIAL=your-xirsys-credential
EOF
```

5. Rebuild: `npm run build`
6. Restart: `pm2 restart frontend`

---

## Questions?

If deployment fails, check:
- [ ] Did you run `npm run build`?
- [ ] Did the build complete successfully?
- [ ] Did you restart the frontend service?
- [ ] Does browser console show TURN config?
- [ ] Are you testing on https://dereevesfoundations.com (not localhost)?

