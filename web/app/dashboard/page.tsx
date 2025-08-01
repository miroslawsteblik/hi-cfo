
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/auth";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import Link from "next/link";
import { FinancialDataErrorBoundary } from "@/components/providers/ErrorBoundary";
import WelcomeSection from "@/components/dashboard/WelcomeSection"
import RealDashboardStats from "@/components/dashboard/RealDashboardStats";
import QuickActions from "@/components/dashboard/QuickActions";
import ServerRecentActivity from "@/components/dashboard/ServerRecentActivity";
import ServerAccountOverview from "@/components/dashboard/ServerAccountOverview";
import ServerAIInsights from "@/components/dashboard/ServerAIInsights";

export default async function DashboardPage() {
  // Get user from server-side cookies
  let user;
  try {
    user = await getServerUser();
  } catch (error) {
    // If getServerUser throws an error, treat it as no user
    redirect("/login");
  }

  // If no user, redirect to login
  if (!user) {
    redirect("/login");
  }

  // TODO: Fetch real dashboard stats from your Go backend
  // For now, using mock data that matches your business logic
  const dashboardStats = {
    totalIncome: 12500,
    totalExpenses: 8750,
    netIncome: 3750,
    totalTransactions: 247,
    categorizedTransactions: 198,
    uncategorizedTransactions: 49,
    activeAccounts: 4,
    thisMonthTransactions: 23,
  };

  const categorizationRate = Math.round(
    (dashboardStats.categorizedTransactions / dashboardStats.totalTransactions) * 100
  );

 

  // user is actually { success: true, data: { ... } }
  const userObj = user || { first_name: '', last_name: '', email: '' };

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
    return "U"; 
  };
  
  // Helper function to get user display name
  const getUserDisplayName = () => {
    const firstName = userObj.first_name?.trim();
    const lastName = userObj.last_name?.trim();
    const email = userObj.email?.trim();
    
    if (firstName && firstName.length > 0) {
      return `${firstName} ${lastName || ''}`.trim();
    }
    if (email && email.length > 0) {
      return email;
    }
    return "User"; // Default display name
  };

  return (
    <AppLayout>
      <PageHeader 
        title="Dashboard" 
        subtitle="Welcome back! Here's what's happening with your finances."
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          
          <WelcomeSection
            title="Welcome back"
            subtitle="Your financial intelligence dashboard is ready."
            categorizationRate={categorizationRate}
            userDisplayName={getUserDisplayName()}
          />

          <FinancialDataErrorBoundary>
            <RealDashboardStats user={user} />
          </FinancialDataErrorBoundary>

          {/* Quick Actions & Recent Activity Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <QuickActions />

            {/* Recent Activity with real data */}
            <FinancialDataErrorBoundary>
              <ServerRecentActivity />
            </FinancialDataErrorBoundary>
          </div>

          {/* Account Overview & AI Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Account Overview with real data */}
            <FinancialDataErrorBoundary>
              <ServerAccountOverview />
            </FinancialDataErrorBoundary>

            {/* AI Insights with real data */}
            <FinancialDataErrorBoundary>
              <ServerAIInsights />
            </FinancialDataErrorBoundary>
          </div>

          {/* User Profile & Security */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* User Profile */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Profile Information</h3>
              
              <div className="flex items-center mb-6">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mr-4">
                  {getUserInitial()}
                </div>
                <div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white text-gray-900 dark:text-white">
                    {getUserDisplayName()}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-300">{userObj.email}</p>
                  <span className="inline-flex px-2 py-1 text-xs font-medium text-gray-900 dark:text-white rounded-full bg-blue-100 text-blue-800 mt-1">
                    {userObj.role || 'User'}
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Member since:</span>
                  <span className="font-medium text-gray-900 dark:text-white">January 2024</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Total accounts:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{dashboardStats.activeAccounts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Total transactions:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{dashboardStats.totalTransactions}</span>
                </div>
              </div>

              <Link
                href="/settings"
                className="mt-4 w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Edit Profile
              </Link>
            </div>

            {/* Security Status */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Security Status</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white text-xs">✓</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white text-green-900">Secure Authentication</span>
                  </div>
                  <span className="text-green-600">Active</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white text-xs">🔒</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white text-green-900">Data Encryption</span>
                  </div>
                  <span className="text-green-600">Enabled</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white text-xs">🛡️</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white text-green-900">Session Security</span>
                  </div>
                  <span className="text-green-600">Protected</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Security Features Active:</strong> httpOnly cookies, CSRF protection, 
                  secure authentication, and automatic session management.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}