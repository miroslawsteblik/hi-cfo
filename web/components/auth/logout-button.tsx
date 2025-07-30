
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleLogout = () => {
    startTransition(async () => {
      try {
        const response = await fetch('/api/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          // Force a hard navigation to clear any cached state
          window.location.href = '/login';
        } else {
          console.error('Logout failed');
          router.push('/login'); // Fallback
        }
      } catch (error) {
        console.error('Logout error:', error);
        router.push('/login'); // Fallback
      }
    });
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isPending}
      className="inline-flex items-center justify-center w-9 h-9 text-sm font-medium text-red-600 bg-white border border-gray-200 rounded-lg hover:bg-red-50 hover:text-red-700 focus:z-10 focus:ring-4 focus:ring-red-200 dark:bg-gray-800 dark:text-red-400 dark:border-gray-600 dark:hover:text-red-300 dark:hover:bg-gray-700 dark:focus:ring-red-800 disabled:opacity-50 transition-colors"
      title={isPending ? "Signing out..." : "Logout"}
    >
      {isPending ? (
        // Loading spinner
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        // Logout icon
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      )}
    </button>
  );
}
