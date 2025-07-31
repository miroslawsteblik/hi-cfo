

import ClientThemeToggle from '@/components/dark-mode/ClientThemeToggle';
import LogoutButton from '@/components/auth/logout-button';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  showLogout?: boolean;
}

export default function PageHeader({ 
  title, 
  subtitle, 
  children, 
  actions,
  showLogout = true 
}: PageHeaderProps) {
  return (
    <div className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center min-h-16 py-4">
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h1>
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
            )}
            {children}
          </div>
          
          <div className="flex items-center space-x-4">
            {actions}
            <ClientThemeToggle />
            {showLogout && (
              <div className="hidden lg:block">
                <LogoutButton />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}