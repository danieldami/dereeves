# Deployment Setup Guide for Truehost VPS

## 🚀 Quick Fix for Network Error

Your app is showing "network error" because the frontend needs to know where your backend API is located.

---

## 📋 Steps to Fix

### 1️⃣ Create Frontend Environment File

On your VPS, create this file: `frontend/.env.production`

```bash
# Navigate to frontend directory
cd ~/dereeves/frontend

# Create the environment file
nano .env.production
```

Add this content (adjust based on your server setup):

```env
# Option A: If backend runs on the same domain (recommended with reverse proxy)
NEXT_PUBLIC_API_URL=https://dereevesfoundations.com/api
NEXT_PUBLIC_SOCKET_URL=https://dereevesfoundations.com

# Option B: If backend runs on a specific port
# NEXT_PUBLIC_API_URL=https://dereevesfoundations.com:5000/api
# NEXT_PUBLIC_SOCKET_URL=https://dereevesfoundations.com:5000

# Option C: If backend is on a subdomain
# NEXT_PUBLIC_API_URL=https://api.dereevesfoundations.com/api
# NEXT_PUBLIC_SOCKET_URL=https://api.dereevesfoundations.com
```

Save the file (Ctrl+X, then Y, then Enter).

---

### 2️⃣ Create Backend Environment File

Create this file: `backend/.env`

```bash
# Navigate to backend directory
cd ~/dereeves/backend

# Create the environment file
nano .env
```

Add this content (replace with your actual values):

```env
# MongoDB Connection String
MONGO_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/dereeves?retryWrites=true&w=majority

# JWT Secret Key (use a strong random string)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long

# Server Port
PORT=5000

# Frontend URL (for CORS) - already configured in server.js
CLIENT_URL=https://dereevesfoundations.com

# Optional: Email Configuration (for password reset)
EMAIL_USER=dereevesfoundations@gmail.com
EMAIL_PASS=your-app-specific-password
```

Save the file (Ctrl+X, then Y, then Enter).

---

### 3️⃣ Rebuild and Restart Your Application

```bash
# Stop current processes
pm2 stop all

# Backend - no rebuild needed, just restart
cd ~/dereeves/backend
pm2 restart backend

# Frontend - needs rebuild with new environment variables
cd ~/dereeves/frontend
npm run build
pm2 restart frontend

# Check status
pm2 status
pm2 logs
```

---

## 🔍 Troubleshooting

### Check if Backend is Running

```bash
# Test backend directly
curl http://localhost:5000/api/auth/login
# Should return: {"message":"Method not allowed"} or similar

# Check if port 5000 is listening
netstat -tlnp | grep 5000
```

### Check Frontend Environment Variables

```bash
cd ~/dereeves/frontend
cat .env.production
```

### Check PM2 Logs

```bash
# View all logs
pm2 logs

# View specific app logs
pm2 logs backend
pm2 logs frontend
```

### Test API from Browser Console

Open your browser at `https://dereevesfoundations.com`, open DevTools (F12), go to Console tab, and run:

```javascript
fetch('https://dereevesfoundations.com/api/auth/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({email: 'test@test.com', password: 'test'})
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

---

## 🌐 Nginx Configuration (If Using Reverse Proxy)

If you want clean URLs without ports, configure Nginx:

```nginx
# /etc/nginx/sites-available/dereevesfoundations.com

server {
    listen 80;
    listen 443 ssl;
    server_name dereevesfoundations.com www.dereevesfoundations.com;

    # SSL configuration
    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;

    # Frontend (Next.js on port 3000)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API (Express on port 5000)
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:5000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

After updating Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## ✅ What Was Fixed in Code

1. ✅ Updated CORS to allow `dereevesfoundations.com`
2. ✅ Updated Socket.IO CORS to allow your domain
3. ✅ Backend now accepts requests from production domain

---

## 📝 Next Steps After Setup

1. Create the environment files on your VPS
2. Add your MongoDB URI and JWT secret
3. Rebuild frontend: `npm run build`
4. Restart both apps: `pm2 restart all`
5. Test login/signup

If you still get errors after this, share:
- PM2 logs: `pm2 logs`
- Browser console errors (F12 → Console tab)
- Your server setup (is Nginx/Apache configured?)

