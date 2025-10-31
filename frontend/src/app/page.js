"use client";

import { useState } from 'react';
import Link from 'next/link';

// --- Component: Navbar ---
const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  const navLinks = [
    { name: 'About', href: '#mission' },
    { name: 'Sign Up', href: '/register' },
    { name: 'Login', href: '/login' },
  ];

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Name */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-2xl font-extrabold text-indigo-700 hover:text-indigo-900 transition duration-300">
              DeReeves Foundation
            </Link>
          </div>
          
          {/* Desktop Nav Links and Donate Button (Hidden on Mobile) */}
          <div className="hidden md:flex items-center space-x-4">
            {navLinks.map((link) => (
              <a 
                key={link.name}
                href={link.href} 
                className="text-gray-600 hover:text-indigo-700 px-3 py-2 rounded-md text-sm font-medium transition duration-300"
              >
                {link.name}
              </a>
            ))}
            
            {/* Desktop Donate Button */}
            <a href="/donate" className="ml-4 px-4 py-2 border border-transparent text-sm font-medium rounded-full text-white bg-red-600 hover:bg-red-700 transition duration-300 shadow-md">
              Donate
            </a>
          </div>

          {/* Mobile Menu Button (Hamburger) */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              aria-controls="mobile-menu"
              aria-expanded="false"
            >
              {!isOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Content */}
      <div className={`${isOpen ? 'block' : 'hidden'} md:hidden`} id="mobile-menu">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          {navLinks.map((link) => (
            <a 
              key={link.name}
              href={link.href} 
              onClick={handleLinkClick}
              className="text-gray-600 hover:bg-gray-50 hover:text-indigo-700 block px-3 py-2 rounded-md text-base font-medium transition duration-300"
            >
              {link.name}
            </a>
          ))}
          
          {/* Mobile Donate Button */}
          <a 
            href="/donate" 
            onClick={handleLinkClick}
            className="block w-full text-center mt-2 px-3 py-2 border border-transparent text-base font-medium rounded-md text-white bg-red-600 hover:bg-red-700 shadow-sm transition duration-300"
          >
            Donate
          </a>
        </div>
      </div>
    </nav>
  );
};

// --- Component: Hero Section ---
const Hero = () => {
  return (
    <header className="relative w-full h-screen flex items-center justify-center text-center overflow-hidden pt-16">
      {/* Background Image/Video Placeholder */}
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/images/hero-bg-placeholder.jpg')", backgroundColor: '#1f2937' }}>
        {/* Dark Overlay for Text Readability */}
        <div className="absolute inset-0 bg-gray-900 opacity-50"></div>
      </div>

      {/* Hero Content */}
      <div className="relative z-10 max-w-4xl px-6">
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-6 animate-fadeInUp">
          Empowering Change, Building Futures.
        </h1>
        <p className="text-xl text-gray-200 mb-10">
          Our foundation supports vital programs in education, health, and sustainable development.
        </p>
        <a 
          href="/register"
          className="bg-indigo-600 text-white px-8 py-3 rounded-full text-lg font-semibold hover:bg-indigo-700 transition duration-300 transform hover:scale-105 shadow-xl mx-4"
        >
          SIGN UP
        </a>

        <a 
          href="/login"
          className="bg-indigo-600 text-white px-8 py-3 rounded-full text-lg font-semibold hover:bg-indigo-700 transition duration-300 transform hover:scale-105 shadow-xl mx-4"
        >
          LOG IN
        </a>
      </div>
    </header>
  );
};

// --- Component: Content Card (Reusable) ---
const ProgramCard = ({ title, description, icon }) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition duration-300 transform hover:-translate-y-1 border border-gray-100">
            <div className="text-4xl text-indigo-600 mb-4">{icon}</div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">{title}</h3>
            <p className="text-gray-600">{description}</p>
        </div>
    );
};

// --- Main Page Component ---
export default function Home() {
  return (
    <div>
      <Navbar />

      <main className="min-h-screen">
        <Hero />

        {/* --- Section: Mission/Impact --- */}
        <section id="mission" className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Our Vision and Commitment</h2>
            <p className="max-w-3xl mx-auto text-xl text-gray-600 mb-12">
              We believe in sustainable, long-term change. Since 2006, we have been dedicated to uplifting communities and empowering individuals to reach their full potential.
            </p>
            
            {/* Impact Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
                <div className="p-6 bg-white rounded-lg shadow-md">
                    <p className="text-5xl font-bold text-indigo-600">500+</p>
                    <p className="text-lg text-gray-500 mt-2">Projects Funded</p>
                </div>
                <div className="p-6 bg-white rounded-lg shadow-md">
                    <p className="text-5xl font-bold text-indigo-600">10K+</p>
                    <p className="text-lg text-gray-500 mt-2">Lives Impacted</p>
                </div>
                <div className="p-6 bg-white rounded-lg shadow-md">
                    <p className="text-5xl font-bold text-indigo-600">80%</p>
                    <p className="text-lg text-gray-500 mt-2">Success Rate</p>
                </div>
            </div>
          </div>
        </section>

        {/* --- Section: Programs/Initiatives --- */}
        <section id="programs" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-extrabold text-gray-900 mb-4">What We Do</h2>
              <p className="max-w-3xl mx-auto text-xl text-gray-600">
                Our initiatives are focused on three core areas to create holistic and lasting change.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <ProgramCard 
                    title="Educational Equity" 
                    description="Funding scholarships, building schools, and providing technology access to underserved students."
                    icon="📚"
                />
                <ProgramCard 
                    title="Community Health" 
                    description="Supporting local clinics, mobile health units, and preventative care education programs."
                    icon="⚕️"
                />
                <ProgramCard 
                    title="Environmental Sustainability" 
                    description="Investing in clean energy solutions and promoting conservation efforts in vulnerable ecosystems."
                    icon="🌳"
                />
            </div>
          </div>
        </section>
        
        {/* --- Call to Action Section --- */}
        <section className="bg-indigo-700 py-16">
            <div className="max-w-4xl mx-auto text-center px-4">
                <h2 className="text-3xl font-bold text-white sm:text-4xl mb-4">
                    Ready to Make an Impact?
                </h2>
                <p className="text-indigo-200 text-xl mb-8">
                    Your generous donation directly supports our programs and helps us achieve our mission.
                </p>
                <a 
                    href="/donate" 
                    className="bg-white text-indigo-700 px-8 py-3 rounded-full text-lg font-semibold hover:bg-gray-100 transition duration-300 transform hover:scale-105 shadow-xl"
                >
                    Give Today
                </a>
            </div>
        </section>

      </main>

      {/* --- Footer --- */}
      <footer className="bg-gray-800 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex flex-col md:flex-row justify-center space-y-4 md:space-y-0 md:space-x-8 mb-6">
            <a href="/privacy" className="text-sm text-gray-400 hover:text-white transition duration-300">Privacy Policy</a>
            <a href="/terms" className="text-sm text-gray-400 hover:text-white transition duration-300">Terms of Use</a>
            <a href="mailto:dereevesfoundations@gmail.com" className="text-sm text-gray-400 hover:text-white transition duration-300">Contact Us</a>
          </div>
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Dereeves Foundation. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
