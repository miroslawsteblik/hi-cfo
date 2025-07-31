"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

// Dynamically import ThemeToggle to avoid SSR issues
const ThemeToggle = dynamic(() => import("./ThemeToggle"), {
  ssr: false,
  loading: () => (
    <div className="inline-flex items-center justify-center w-9 h-9 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 animate-pulse">
      <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
    </div>
  ),
});

export default function ClientThemeToggle() {
  return (
    <Suspense
      fallback={
        <div className="inline-flex items-center justify-center w-9 h-9 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600">
          <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
        </div>
      }
    >
      <ThemeToggle />
    </Suspense>
  );
}
