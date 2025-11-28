/** @type {import('next').NextConfig} */
const nextConfig = {
  // Environment variables are automatically exposed via NEXT_PUBLIC_ prefix
  // Make sure to set these in .env.local or your deployment platform:
  // NEXT_PUBLIC_API_URL - Backend API URL
  // NEXT_PUBLIC_SOCKET_URL - Socket.IO server URL
  
  // Skip static optimization for verify-email route
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
};

export default nextConfig;
