// components/auth/logout-button.tsx
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
      className="bg-red-600 dark:bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 dark:hover:bg-red-700 disabled:opacity-50 transition-colors"
    >
      {isPending ? "Signing out..." : "Logout"}
    </button>
  );
}
