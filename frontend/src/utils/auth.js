// src/utils/auth.js

// Checks if user is logged in
export const isAuthenticated = () => {
  // window is undefined on the server, so this prevents errors in Next.js
  if (typeof window === "undefined") return false;

  // Get token from localStorage
  const token = localStorage.getItem("token");

  // Return true if token exists, false otherwise
  return !!token;
};
