module.exports = {
  apps: [{
    name: 'deereeves-backend',
    script: './src/server.js',
    cwd: '/var/www/deereeves/dereeves/backend',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      MONGO_URI: 'mongodb+srv://dereeves:dereeves1@cluster0.k93rlyi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
      JWT_SECRET: 'mySuperSecretKeypr',
      // Frontend origin (used by CORS and redirects)
      CLIENT_URL: 'https://dereevesfoundations.com'
    }
  }]
};

