// frontend/src/app/login/page.js

"use client";
import { useState } from "react";
import api from "@/utils/api";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/auth/login", form);
      const token = res.data.token;
      const user = res.data.user; 
      console.log("Login successful:", res.data);

      if (!user) {
        console.error("User object missing from response:", res.data);
        alert("Unexpected response from server");
        return;
      }

      // ✅ Save token to localStorage
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(user));

      // 👇 redirect based on role
      if (user.role === "admin") {
        router.push("/admin-dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      console.error("Login failed:", { status, data, error });
      if (status === 400) {
        alert(data?.message || "Invalid credentials");
        return;
      }
      if (status === 401) {
        alert(data?.message || "Not authorized");
        return;
      }
      alert(data?.message || error?.message || "Login failed");
    }
  };

  return (
    // Centering container with a background color and minimum height
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 relative">
      
      {/* ⬅️ NEW: Back to Home Button/Link */}
      <a 
        onClick={() => router.push('/landing')}
        className="absolute top-4 left-4 flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer transition duration-150"
      >
        <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Home
      </a>
      
      {/* Login Card Container */}
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl border border-gray-100">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-indigo-700">
            Welcome Back!
          </h1>
          <p className="text-gray-500 mt-2">
            Sign in to access your dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="you@example.com"
              onChange={handleChange}
              // Redesigned input field style
              className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 text-black"
            />
          </div>
          
          {/* Password Input */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="••••••••"
              onChange={handleChange}
              // Redesigned input field style
              className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 text-black"
            />
          </div>

          {/* Forgot Password Link and Login Button */}
          <div>
            {/* Forgot Password Link */}
            <div className="flex justify-end mb-4">
              <button
                type="button"
                onClick={() => router.push("/forgot-password")}
                // Using the red accent color for forgotten password as a secondary link
                className="text-sm font-medium text-red-600 hover:text-red-700 hover:underline transition duration-150"
              >
                Forgot Password?
              </button>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              // Redesigned button using the primary indigo color
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 transform hover:scale-[1.01]"
            >
              Log In
            </button>
          </div>

          {/* Signup Link */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <a 
                onClick={() => router.push("/signup")} // Assuming a /signup route
                className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
              >
                Sign up here
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}