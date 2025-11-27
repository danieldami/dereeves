// frontend/src/app/signup/page.js

"use client";
import { useState } from "react";
import api from "@/utils/api";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter(); 
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false); 

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true); 
    setMessage(""); 
    try {
      const res = await api.post("/auth/register", form);
      setMessage(res.data.message || "Registration successful! Please check your email to verify your account.");
      
      // Don't redirect - let user see the message about checking email
      // They can manually go to login after verifying 

    } catch (err) {
      setMessage(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false); 
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

      {/* Registration Card Container */}
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl border border-gray-100">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-indigo-700">
            Create Your Account
          </h1>
          <p className="text-gray-500 mt-2">
            Join the foundation community in one simple step.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Name Input */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="Your Name"
              onChange={handleChange}
              value={form.name}
              required
              className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 text-black"
            />
          </div>

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
              value={form.email}
              required
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
              placeholder="Create a strong password"
              onChange={handleChange}
              value={form.password}
              required
              className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 text-black"
            />
          </div>

          {/* Registration Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 transform hover:scale-[1.01] disabled:bg-indigo-400"
          >
            {isLoading ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              'Register Account'
            )}
          </button>
          
          {/* Login Link */}
          <div className="text-center mt-6 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <a 
                onClick={() => router.push("/login")} 
                className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
              >
                Log in
              </a>
            </p>
          </div>
        </form>

        {/* Message Display */}
        {message && (
          <div 
            className={`mt-4 text-center p-4 rounded-lg ${
              message.includes("successful") || message.includes("check your email") 
                ? "bg-blue-50 border border-blue-200 text-blue-800" 
                : "bg-red-100 text-red-700"
            }`}
          >
            <p className="font-medium">{message}</p>
            {message.includes("check your email") && (
              <p className="text-sm mt-2 text-blue-600">
                Didn't receive the email? Check your spam folder or try registering again.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}