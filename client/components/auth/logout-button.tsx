// components/auth/logout-button.tsx
"use client";

import { useTransition } from "react";
import { logoutAction } from "@/lib/auth";

export default function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
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
