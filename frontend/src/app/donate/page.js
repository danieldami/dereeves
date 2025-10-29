// frontend/src/app/donate/page.js

import Link from 'next/link';
// The problematic import has been removed: import { ArrowLeftIcon } from '@heroicons/react/24/solid'; 

// Metadata for SEO (App Router method)
export const metadata = {
  title: 'Make a Donation | Your Foundation',
  description: 'Support our mission by making a secure donation. Please sign up or log in to continue.',
};

export default function DonatePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      
      {/* Back to Home Button/Link */}
      <Link 
        href="/landing"
        className="absolute top-4 left-4 flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer transition duration-150"
      >
        {/* REPLACED with INLINE SVG: */}
        <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Home
      </Link>
      
      {/* Donation Card Container */}
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl border border-gray-100 text-center">
        
        {/* Header and Core Message */}
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold text-indigo-700 mb-4">
            Support Our Mission
          </h1>
          <p className="text-xl text-gray-700 font-semibold">
            To make a donation, sign up first or login.
          </p>
        </div>

        

        {/* Login and Signup Buttons (Stacked) */}
        <div className="space-y-4">
          
          {/* Login Button (Primary Action for existing users) */}
          <Link 
            href="/login" 
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 transform hover:scale-[1.01]"
          >
            Log In
          </Link>
          
          {/* Signup Button (Secondary/Accent Action) */}
          <Link 
            href="/register"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-lg font-medium text-indigo-600 bg-white border-2 border-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 transform hover:scale-[1.01]"
          >
            Sign Up
          </Link>
        </div>

        {/* Note/Alternative Action */}
        <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-500">
                If you have already logged in, you will be redirected to the dashboardclicking "Log In".
            </p>
        </div>
        
      </div>
    </div>
  );
}