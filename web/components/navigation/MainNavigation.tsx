// components/navigation/MainNavigation.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import ClientThemeToggle from "@/components/ui/ClientThemeToggle";

interface NavItem {
  name: string;
  href: string;
  icon: string;
  description?: string;
  badge?: string;
}

const navigation: NavItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: "🏠",
    description: "Overview and insights",
  },
  {
    name: "Transactions",
    href: "/transactions",
    icon: "💰",
    description: "Manage transactions",
  },
  {
    name: "Accounts",
    href: "/accounts",
    icon: "🏦",
    description: "Bank accounts",
  },
  {
    name: "Categories",
    href: "/categories",
    icon: "📂",
    description: "Expense categories",
  },
  {
    name: "Budgets",
    href: "/budgets",
    icon: "📊",
    description: "Budget planning",
  },
  {
    name: "Goals",
    href: "/goals",
    icon: "🎯",
    description: "Financial goals",
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: "📈",
    description: "Financial analytics",
  },
  {
    name: "Settings",
    href: "/settings",
    icon: "⚙️",
    description: "Account settings",
  },
];

interface MainNavigationProps {
  user: {
    first_name?: string;
    last_name?: string;
    email: string;
    // Support for wrapped API response format (legacy)
    data?: {
      first_name?: string;
      last_name?: string;
      email: string;
    };
  };
}

export default function MainNavigation({ user }: MainNavigationProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  // Handle both wrapped (legacy) and unwrapped user data formats
  const userObj = user.data || user || { first_name: "", last_name: "", email: "" };

  // Helper function to get user display initial
  const getUserInitial = () => {
    const firstName = userObj.first_name?.trim();
    const email = userObj.email?.trim();

    if (firstName && firstName.length > 0) {
      return firstName[0].toUpperCase();
    }
    if (email && email.length > 0) {
      return email[0].toUpperCase();
    }
    return "U"; // Default to "U" for User instead of "?"
  };

  // Helper function to get user display name
  const getUserDisplayName = () => {
    const firstName = userObj.first_name?.trim();
    const lastName = userObj.last_name?.trim();
    const email = userObj.email?.trim();

    if (firstName && firstName.length > 0) {
      return `${firstName} ${lastName || ""}`.trim();
    }
    if (email && email.length > 0) {
      return email;
    }
    return "User"; // Default display name
  };
  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="bg-white dark:bg-gray-800 p-2 rounded-md shadow-md border border-gray-200 dark:border-gray-700"
        >
          <span className="text-xl">☰</span>
        </button>
      </div>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">Hi-CFO</span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        {/* User info */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {getUserInitial()}
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{getUserDisplayName()}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{userObj.email || "No email"}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-2">
          {navigation.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  active
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-r-2 border-blue-700 dark:border-blue-400"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <span className="text-lg mr-3">{item.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  {item.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.description}</p>}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <ClientThemeToggle />
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">Hi-CFO Financial Dashboard</div>
        </div>
      </div>
    </>
  );
}
