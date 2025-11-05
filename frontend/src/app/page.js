"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to landing page
    router.push('/landing');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-xl text-gray-600">Redirecting...</p>
    </div>
  );
}
