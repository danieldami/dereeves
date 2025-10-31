module.exports = {
  apps: [
    {
      name: 'deereeves-backend',
      script: './backend/src/server.js',
      cwd: '/var/www/deereeves/dereeves',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        MONGO_URI: 'mongodb+srv://dereeves:dereeves1@cluster0.k93rlyi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
        JWT_SECRET: 'mySuperSecretKeypr',
        CLIENT_URL: 'https://dereevesfoundations.com'
      }
    },
    {
      name: 'deereeves-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/deereeves/dereeves/frontend',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXT_PUBLIC_API_URL: 'https://dereevesfoundations.com/api',
        NEXT_PUBLIC_SOCKET_URL: 'https://dereevesfoundations.com'
      }
    }
  ]
};


