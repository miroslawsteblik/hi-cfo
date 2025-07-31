// components/layout/AppLayout.tsx
import { getServerUser } from "@/lib/auth/auth";
import MainNavigation from "@/components/navigation/MainNavigation";
import LogoutButton from "@/components/auth/logout-button";
import ClientThemeToggle from "@/components/dark-mode/ClientThemeToggle";

interface AppLayoutProps {
  children: React.ReactNode;
  showNavigation?: boolean;
}

export default async function AppLayout({
  children,
  showNavigation = true,
}: AppLayoutProps) {
  const user = await getServerUser();

  // If no navigation needed (like login/register pages), just render children
  if (!showNavigation || !user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar Navigation */}
      <MainNavigation user={user} />

      {/* Main Content */}
      <div className="flex-1 lg:ml-0">
        {/* Top Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 lg:hidden">
          <div className="flex items-center justify-between h-16 px-4">
            <div className="ml-12">
              {" "}
              {/* Space for mobile menu button */}
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Hi-CFO</h1>
            </div>
            <div className="flex items-center space-x-3">
              <ClientThemeToggle />
              <LogoutButton />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
