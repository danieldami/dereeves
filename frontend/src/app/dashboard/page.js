// frontend/src/app/dashboard/page.js

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/utils/api";
import { isAuthenticated } from "@/utils/auth";
import Link from "next/link";
import socket from "@/utils/socket";

// --- Dashboard Navigation Links ---
const DashboardNav = ({ userRole, handleLogout, router }) => {
  const navItems = [
    { name: "Go to Chat", href: "/chat", icon: "💬" },
    { name: "Change Password", action: () => router.push("/change-password"), icon: "🔒" },
  ];

  return (
    <div className="flex flex-col space-y-4">
      
      {navItems.map((item) => {
        if (item.role && item.role !== userRole) return null;

        const buttonClass = "w-full flex items-center justify-start px-4 py-3 rounded-lg text-white font-medium bg-indigo-600 hover:bg-indigo-700 transition duration-150 shadow-md transform hover:scale-[1.01]";

        if (item.href) {
            return (
                <Link key={item.name} href={item.href} className={buttonClass}>
                    <span className="mr-3 text-lg">{item.icon}</span>
                    {item.name}
                </Link>
            );
        } else if (item.action) {
            return (
                <button key={item.name} onClick={item.action} className={buttonClass}>
                    <span className="mr-3 text-lg">{item.icon}</span>
                    {item.name}
                </button>
            );
        }
        return null;
      })}

      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-start px-4 py-3 rounded-lg text-white font-medium bg-red-600 hover:bg-red-700 transition duration-150 shadow-md mt-6"
      >
        <span className="mr-3 text-lg">🚪</span>
        Logout
      </button>
    </div>
  );
};


export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
    } else {
      fetchUser();
    }
  }, []);

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const localUser = JSON.parse(localStorage.getItem("user") || "{}");
      setUser(res.data.user || localUser); 
    } catch (error) {
      console.error("Error fetching user:", error);
      const localUser = JSON.parse(localStorage.getItem("user") || "{}");
      if (localUser.email) {
          setUser(localUser);
      } else {
          router.push("/login");
      }
    }
  };


  useEffect(() => {
    if (user?._id) {
      // 🚀 CORRECTION: Check connection and use socket.emit directly
            if (!socket.connected) {
                socket.connect(); // Ensure socket is connected before emitting
            }
            
            socket.emit("register", { // Correct way to register a user
                userId: user._id, 
                role: user.role || "user"
            });
            console.log(`Socket registered user: ${user._id}`);
    }
  }, [user]);


  // 🚪 Logout function
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user"); 
    // FIX: Use socketIo alias for the default export
    if (socket) { 
        socket.disconnect(); 
    }
    router.push("/login");
  };

  if (!user) return <p className="text-center mt-10 text-xl text-gray-600">Loading dashboard...</p>;


  return (
    <div className="min-h-screen flex bg-gray-50">
      
      <aside className="w-64 bg-white border-r border-gray-100 shadow-xl p-6 flex flex-col items-center">
        
        <h2 className="text-2xl font-extrabold text-indigo-700 mb-8">
            Dashboard
        </h2>

        <div className="text-center mb-10 pb-4 border-b border-gray-100 w-full">
            <p className="text-sm font-medium text-gray-800">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
            <span className="inline-flex items-center mt-2 px-3 py-1 text-xs font-semibold rounded-full text-indigo-600 bg-indigo-100">
                {user.role === 'admin' ? 'Administrator' : 'Community Member'}
            </span>
        </div>

        <DashboardNav 
          userRole={user.role} 
          handleLogout={handleLogout} 
          router={router} 
        />
      </aside>

      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Welcome Back, {user.name.split(' ')[0]}!
        </h1>
        
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Quick Overview</h2>
          <p className="text-gray-600">
            Click the chat button to talk with the customer care
          </p>

          
        </div>

      </main>
    </div>
  );
}