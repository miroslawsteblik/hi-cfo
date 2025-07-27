
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import Link from "next/link";

export default async function DashboardPage() {
  // Get user from server-side cookies
  const user = await getServerUser();

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

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
    return "U"; // Default to "U" for User instead of "?"
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
      {/* Page Header */}
      <PageHeader 
        title="Dashboard" 
        subtitle="Welcome back! Here's what's happening with your finances."
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          
          {/* Welcome Hero Section */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg text-white p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-2">
                  Welcome back, {getUserDisplayName()}! 👋
                </h1>
                <p className="text-blue-100 text-lg">
                  Your financial intelligence dashboard is ready. 
                  {categorizationRate >= 80 && " Great job on keeping your transactions organized!"}
                </p>
              </div>
              <div className="mt-4 md:mt-0 flex space-x-3">
                <Link
                  href="/transactions"
                  className="bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors"
                >
                  View Transactions
                </Link>
                <Link
                  href="/transactions"
                  className="bg-blue-800 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-900 transition-colors"
                >
                  Import OFX
                </Link>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Income */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Income</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {formatCurrency(dashboardStats.totalIncome)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📈</span>
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  +12% from last month
                </span>
              </div>
            </div>

            {/* Total Expenses */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">
                    {formatCurrency(dashboardStats.totalExpenses)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">💸</span>
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">
                  +3% from last month
                </span>
              </div>
            </div>

            {/* Net Income */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Net Income</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {formatCurrency(dashboardStats.netIncome)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">💰</span>
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                  +18% from last month
                </span>
              </div>
            </div>

            {/* Auto-Categorization Rate */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Categorization Rate</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">
                    {categorizationRate}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🧠</span>
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  categorizationRate >= 80 
                    ? 'text-green-600 bg-green-100' 
                    : 'text-yellow-600 bg-yellow-100'
                }`}>
                  {dashboardStats.categorizedTransactions} of {dashboardStats.totalTransactions} categorized
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions & Recent Activity Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
              <div className="space-y-4">
                
                {/* Import Transactions */}
                <Link
                  href="/transactions"
                  className="flex items-center p-4 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors group"
                >
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white mr-4">
                    <span className="text-lg">📄</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 group-hover:text-blue-600">
                      Import OFX Files
                    </h4>
                    <p className="text-sm text-gray-600">
                      Upload bank transactions with smart categorization
                    </p>
                  </div>
                  <span className="text-blue-600">→</span>
                </Link>

                {/* Manage Transactions */}
                <Link
                  href="/transactions"
                  className="flex items-center p-4 rounded-lg bg-green-50 hover:bg-green-100 transition-colors group"
                >
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center text-white mr-4">
                    <span className="text-lg">💰</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 group-hover:text-green-600">
                      Manage Transactions
                    </h4>
                    <p className="text-sm text-gray-600">
                      View, edit, and categorize your transactions
                    </p>
                  </div>
                  <span className="text-green-600">→</span>
                </Link>

                {/* View Accounts */}
                <Link
                  href="/accounts"
                  className="flex items-center p-4 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors group"
                >
                  <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white mr-4">
                    <span className="text-lg">🏦</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 group-hover:text-purple-600">
                      Manage Accounts
                    </h4>
                    <p className="text-sm text-gray-600">
                      View and organize your bank accounts
                    </p>
                  </div>
                  <span className="text-purple-600">→</span>
                </Link>

                {/* Categories */}
                <Link
                  href="/categories"
                  className="flex items-center p-4 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors group"
                >
                  <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center text-white mr-4">
                    <span className="text-lg">📂</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 group-hover:text-orange-600">
                      Manage Categories
                    </h4>
                    <p className="text-sm text-gray-600">
                      Organize and customize expense categories
                    </p>
                  </div>
                  <span className="text-orange-600">→</span>
                </Link>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                <Link href="/transactions" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  View All →
                </Link>
              </div>
              
              <div className="space-y-4">
                {/* Mock recent transactions */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-xs">🛒</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">Grocery Store</p>
                      <p className="text-xs text-gray-500">2 hours ago</p>
                    </div>
                  </div>
                  <span className="text-red-600 font-medium text-sm">-$67.89</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-xs">💰</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">Salary Deposit</p>
                      <p className="text-xs text-gray-500">1 day ago</p>
                    </div>
                  </div>
                  <span className="text-green-600 font-medium text-sm">+$2,500.00</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-xs">☕</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">Coffee Shop</p>
                      <p className="text-xs text-gray-500">2 days ago</p>
                    </div>
                  </div>
                  <span className="text-red-600 font-medium text-sm">-$5.47</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-xs">⛽</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">Gas Station</p>
                      <p className="text-xs text-gray-500">3 days ago</p>
                    </div>
                  </div>
                  <span className="text-red-600 font-medium text-sm">-$45.23</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 text-center">
                  {dashboardStats.thisMonthTransactions} transactions this month
                </p>
              </div>
            </div>
          </div>

          {/* Account Overview & AI Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Account Overview */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Account Overview</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                      <span className="text-lg">🏦</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Main Checking</h4>
                      <p className="text-sm text-gray-600">****1234</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">$8,457.23</p>
                    <p className="text-xs text-green-600">+2.3%</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                      <span className="text-lg">💰</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Savings Account</h4>
                      <p className="text-sm text-gray-600">****5678</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">$15,234.67</p>
                    <p className="text-xs text-green-600">+1.8%</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-4">
                      <span className="text-lg">💳</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Credit Card</h4>
                      <p className="text-sm text-gray-600">****9012</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-600">-$1,456.78</p>
                    <p className="text-xs text-red-600">Balance due</p>
                  </div>
                </div>
              </div>

              <Link
                href="/accounts"
                className="mt-4 w-full inline-flex items-center justify-center px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Manage All Accounts
              </Link>
            </div>

            {/* AI Insights */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">AI Insights</h3>
              
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <span className="text-white text-sm">🧠</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-900">Smart Categorization</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        {categorizationRate}% of your transactions are automatically categorized. 
                        {categorizationRate < 80 && " Consider reviewing uncategorized transactions."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <span className="text-white text-sm">📊</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-green-900">Spending Trend</h4>
                      <p className="text-sm text-green-700 mt-1">
                        Your expenses decreased by 5% compared to last month. Great job staying on budget!
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <span className="text-white text-sm">⚠️</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-yellow-900">Action Needed</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        {dashboardStats.uncategorizedTransactions} transactions need categorization for better insights.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Link
                href="/transactions"
                className="mt-4 w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Review Transactions
              </Link>
            </div>
          </div>

          {/* User Profile & Security */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* User Profile */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Profile Information</h3>
              
              <div className="flex items-center mb-6">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mr-4">
                  {getUserInitial()}
                </div>
                <div>
                  <h4 className="text-lg font-medium text-gray-900">
                    {getUserDisplayName()}
                  </h4>
                  <p className="text-gray-600">{userObj.email}</p>
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 mt-1">
                    {userObj.role || 'User'}
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Member since:</span>
                  <span className="font-medium">January 2024</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total accounts:</span>
                  <span className="font-medium">{dashboardStats.activeAccounts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total transactions:</span>
                  <span className="font-medium">{dashboardStats.totalTransactions}</span>
                </div>
              </div>

              <Link
                href="/settings"
                className="mt-4 w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Edit Profile
              </Link>
            </div>

            {/* Security Status */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Security Status</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white text-xs">✓</span>
                    </div>
                    <span className="text-sm font-medium text-green-900">Secure Authentication</span>
                  </div>
                  <span className="text-green-600">Active</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white text-xs">🔒</span>
                    </div>
                    <span className="text-sm font-medium text-green-900">Data Encryption</span>
                  </div>
                  <span className="text-green-600">Enabled</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white text-xs">🛡️</span>
                    </div>
                    <span className="text-sm font-medium text-green-900">Session Security</span>
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