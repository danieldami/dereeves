// frontend/src/app/dashboard/page.js

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/utils/api";
import { isAuthenticated } from "@/utils/auth";
import Link from "next/link";
import socket from "@/utils/socket";

// --- Dashboard Navigation Links ---
const DashboardNav = ({ userRole, handleLogout, router, admins }) => {
  const navItems = [
    { name: "Change Password", action: () => router.push("/change-password"), icon: "🔒" },
  ];

  return (
    <div className="flex flex-col space-y-4">
      
      {/* Show admin chat buttons for regular users */}
      {userRole !== "admin" && admins && admins.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Contact Support</p>
          {admins.map((admin) => (
            <Link 
              key={admin._id} 
              href={`/chat?adminId=${admin._id}`} 
              className="w-full flex items-center justify-start px-4 py-3 rounded-lg text-white font-medium bg-indigo-600 hover:bg-indigo-700 transition duration-150 shadow-md transform hover:scale-[1.01]"
            >
              <span className="mr-3 text-lg">💬</span>
              Chat with {admin.name}
            </Link>
          ))}
        </div>
      )}

      {/* Show single admin chat button for admins */}
      {userRole === "admin" && (
        <Link 
          href="/admin-dashboard" 
          className="w-full flex items-center justify-start px-4 py-3 rounded-lg text-white font-medium bg-indigo-600 hover:bg-indigo-700 transition duration-150 shadow-md transform hover:scale-[1.01]"
        >
          <span className="mr-3 text-lg">💬</span>
          Go to Admin Dashboard
        </Link>
      )}

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
  const [admins, setAdmins] = useState([]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
    } else {
      fetchUser();
      fetchAdmins();
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

  const fetchAdmins = async () => {
    try {
      const res = await api.get("/messages/admin/info");
      console.log("✅ Fetched admins:", res.data);
      setAdmins(res.data);
    } catch (error) {
      console.error("Error fetching admins:", error);
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
    <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-br from-gray-50 to-gray-100">
      
      {/* Sidebar - Hidden on mobile, shown on desktop */}
      <aside className="hidden lg:flex lg:w-72 bg-white border-r border-gray-200 shadow-xl p-6 flex-col items-center">
        
        <h2 className="text-2xl font-extrabold text-gray-800 mb-8">
            Dashboard
        </h2>

        <div className="text-center mb-10 pb-4 border-b border-gray-200 w-full">
            <p className="text-sm font-medium text-gray-800">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
            <span className="inline-flex items-center mt-2 px-3 py-1 text-xs font-semibold rounded-full text-gray-700 bg-gray-200">
                {user.role === 'admin' ? 'Administrator' : 'Community Member'}
            </span>
        </div>

        <DashboardNav 
          userRole={user.role} 
          handleLogout={handleLogout} 
          router={router}
          admins={admins}
        />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile Header with Menu */}
        <div className="lg:hidden sticky top-0 z-20 bg-white shadow-md px-4 py-3 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800">Memorial Dashboard</h2>
            <button
              onClick={handleLogout}
              className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
            >
              <span>🚪</span> Logout
            </button>
          </div>
        </div>

        {/* Memorial Content */}
        <div className="px-4 py-6 lg:px-8 lg:py-10 max-w-5xl mx-auto">
          
          {/* Memorial Header */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden mb-6">
            {/* Decorative Border */}
            <div className="h-2 bg-gradient-to-r from-gray-400 via-gray-600 to-gray-400"></div>
            
            <div className="p-6 sm:p-8 lg:p-12 text-center">
              {/* Invitation Text */}
              <p className="text-sm sm:text-base text-gray-600 italic mb-6 leading-relaxed">
                Join us to mourn the 1 year remembrance of our beloved
              </p>
              <p className="text-base sm:text-lg text-gray-700 font-semibold mb-4">
                Mother • Sister • Wife
              </p>

              {/* Name */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-gray-900 mb-4">
                Patricia Taylor
              </h1>

              {/* Dates */}
              <div className="flex items-center justify-center gap-3 mb-8">
                <span className="text-xl sm:text-2xl text-gray-600 font-light">1944</span>
                <span className="text-2xl sm:text-3xl text-gray-400">—</span>
                <span className="text-xl sm:text-2xl text-gray-600 font-light">2024</span>
              </div>

              {/* Decorative Divider */}
              <div className="flex items-center justify-center my-8">
                <div className="h-px bg-gray-300 w-16"></div>
                <div className="mx-4 text-gray-400">✦</div>
                <div className="h-px bg-gray-300 w-16"></div>
              </div>

              {/* Memorial Message */}
              <div className="max-w-2xl mx-auto">
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-6">
                  In loving memory of a remarkable woman whose warmth, kindness, and spirit touched the hearts of everyone she met. 
                  Though she is no longer with us, her legacy lives on through the countless lives she enriched.
                </p>

                {/* Donation Notice */}
                <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 sm:p-6 mt-8">
                  <p className="text-sm sm:text-base text-gray-700 font-medium mb-2">
                    💐 Support the Foundation
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600">
                    To donate to the foundation or send condolences, please contact management using the chat options below.
                  </p>
                </div>
              </div>
            </div>

            {/* Decorative Border */}
            <div className="h-2 bg-gradient-to-r from-gray-400 via-gray-600 to-gray-400"></div>
          </div>

          {/* Mobile Navigation Cards */}
          <div className="lg:hidden space-y-4 mt-8">
            <div className="bg-white rounded-xl shadow-lg p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Contact Support</p>
              
              {user.role !== "admin" && admins && admins.length > 0 && (
                <div className="space-y-3">
                  {admins.map((admin) => (
                    <Link 
                      key={admin._id} 
                      href={`/chat?adminId=${admin._id}`} 
                      className="w-full flex items-center justify-start px-4 py-3 rounded-lg text-white font-medium bg-gray-700 hover:bg-gray-800 transition duration-150 shadow-md"
                    >
                      <span className="mr-3 text-lg">💬</span>
                      Chat with {admin.name}
                    </Link>
                  ))}
                </div>
              )}

              {user.role === "admin" && (
                <Link 
                  href="/admin-dashboard" 
                  className="w-full flex items-center justify-start px-4 py-3 rounded-lg text-white font-medium bg-gray-700 hover:bg-gray-800 transition duration-150 shadow-md"
                >
                  <span className="mr-3 text-lg">💬</span>
                  Go to Admin Dashboard
                </Link>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-lg p-4">
              <button
                onClick={() => router.push("/change-password")}
                className="w-full flex items-center justify-start px-4 py-3 rounded-lg text-white font-medium bg-gray-700 hover:bg-gray-800 transition duration-150 shadow-md"
              >
                <span className="mr-3 text-lg">🔒</span>
                Change Password
              </button>
            </div>
          </div>

          {/* User Info Card for Mobile */}
          <div className="lg:hidden mt-4 bg-white rounded-xl shadow-lg p-4 text-center">
            <p className="text-sm font-medium text-gray-800">{user.name}</p>
            <p className="text-xs text-gray-500 mt-1">{user.email}</p>
          </div>
        </div>
      </main>
    </div>
  );
}