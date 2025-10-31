module.exports = {
  apps: [
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
      },
      // If using domain, use:
      // NEXT_PUBLIC_API_URL: 'https://dereevesfoundations.com/api',
      // NEXT_PUBLIC_SOCKET_URL: 'https://dereevesfoundations.com'
    }
  ]
};

