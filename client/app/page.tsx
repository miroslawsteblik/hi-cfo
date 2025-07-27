// app/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerUser } from "@/lib/auth";

export default async function HomePage() {
  // Check if user is already authenticated
  const user = await getServerUser();

  // If user is logged in, redirect to dashboard
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-blue-600">Hi-CFO</span>
              <span className="ml-2 text-sm text-gray-500 font-medium">Financial Intelligence</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-8">
              <span className="mr-2">🚀</span>
              New: AI-Powered Transaction Categorization
            </div>
            
            <h1 className="text-4xl tracking-tight font-bold text-gray-900 sm:text-5xl md:text-6xl">
              <span className="block">Smart Financial</span>
              <span className="block text-blue-600">Management Made Simple</span>
            </h1>
            
            <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-600 leading-relaxed">
              Transform your financial data into actionable insights with AI-powered categorization, 
              real-time analytics, and intelligent automation. Take control of your finances like never before.
            </p>
            
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
              >
                <span className="mr-2">✨</span>
                Start Free Trial
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-8 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
              >
                <span className="mr-2">👋</span>
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything you need to master your finances
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Powerful features designed for modern financial management, 
              from smart categorization to comprehensive reporting.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Smart Categorization */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <span className="text-2xl">🧠</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                AI-Powered Categorization
              </h3>
              <p className="text-gray-600 mb-4">
                Automatically categorize transactions with 80%+ accuracy using advanced 
                similarity algorithms and machine learning.
              </p>
              <div className="flex items-center text-blue-600 text-sm font-medium">
                <span>Learn more</span>
                <span className="ml-1">→</span>
              </div>
            </div>

            {/* Real-time Analytics */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Real-time Analytics
              </h3>
              <p className="text-gray-600 mb-4">
                Track your financial performance with live dashboards, 
                trend analysis, and comprehensive reporting tools.
              </p>
              <div className="flex items-center text-blue-600 text-sm font-medium">
                <span>Explore features</span>
                <span className="ml-1">→</span>
              </div>
            </div>

            {/* Bulk Import */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Smart Bulk Import
              </h3>
              <p className="text-gray-600 mb-4">
                Import thousands of transactions from OFX files with 
                intelligent categorization preview and manual overrides.
              </p>
              <div className="flex items-center text-blue-600 text-sm font-medium">
                <span>See it in action</span>
                <span className="ml-1">→</span>
              </div>
            </div>

            {/* Security */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-6">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Bank-Level Security
              </h3>
              <p className="text-gray-600 mb-4">
                Your data is protected with enterprise-grade encryption, 
                secure authentication, and complete privacy controls.
              </p>
              <div className="flex items-center text-blue-600 text-sm font-medium">
                <span>Security details</span>
                <span className="ml-1">→</span>
              </div>
            </div>

            {/* Multi-Account */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-6">
                <span className="text-2xl">🏦</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Multi-Account Management
              </h3>
              <p className="text-gray-600 mb-4">
                Manage checking, savings, credit cards, and investment accounts 
                all in one unified dashboard.
              </p>
              <div className="flex items-center text-blue-600 text-sm font-medium">
                <span>Account features</span>
                <span className="ml-1">→</span>
              </div>
            </div>

            {/* Smart Insights */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-6">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Smart Insights
              </h3>
              <p className="text-gray-600 mb-4">
                Get personalized recommendations, spending alerts, 
                and goal tracking to optimize your financial health.
              </p>
              <div className="flex items-center text-blue-600 text-sm font-medium">
                <span>View insights</span>
                <span className="ml-1">→</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Get started in minutes
            </h2>
            <p className="text-lg text-gray-600">
              Simple setup process that gets you from zero to full financial insights
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Connect Your Accounts
              </h3>
              <p className="text-gray-600">
                Securely link your bank accounts or import transaction files. 
                We support OFX, CSV, and direct bank connections.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                AI Categorizes Everything
              </h3>
              <p className="text-gray-600">
                Our smart categorization engine automatically organizes your transactions. 
                Review and adjust as needed with manual overrides.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Get Insights & Take Action
              </h3>
              <p className="text-gray-600">
                Access real-time dashboards, spending trends, and actionable 
                recommendations to optimize your financial decisions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-16 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-white mb-2">80%+</div>
              <div className="text-blue-100">Auto-categorization accuracy</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-2">1000+</div>
              <div className="text-blue-100">Transactions processed per minute</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-2">50+</div>
              <div className="text-blue-100">Supported file formats</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-2">99.9%</div>
              <div className="text-blue-100">Uptime guarantee</div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Ready to take control of your finances?
          </h2>
          <p className="text-lg text-gray-600 mb-10">
            Join thousands of users who have transformed their financial management 
            with Hi-CFO's intelligent platform.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
            >
              <span className="mr-2">🚀</span>
              Start Your Free Trial
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm border border-gray-300"
            >
              <span className="mr-2">👤</span>
              Sign In to Continue
            </Link>
          </div>
          
          <p className="text-sm text-gray-500">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <span className="text-2xl font-bold text-blue-600">Hi-CFO</span>
              <span className="ml-4 text-sm text-gray-500">
                © 2024 Hi-CFO. All rights reserved.
              </span>
            </div>
            
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <Link href="/privacy" className="hover:text-gray-900 transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-gray-900 transition-colors">
                Terms of Service
              </Link>
              <Link href="/support" className="hover:text-gray-900 transition-colors">
                Support
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}