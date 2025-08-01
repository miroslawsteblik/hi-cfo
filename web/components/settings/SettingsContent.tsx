"use client";

import { useState } from "react";
import { User, Currency } from "@/lib/shared/types";
import ThemeToggle from "@/components/dark-mode/ThemeToggle";
import { updateUserCurrencyPreference } from "@/lib/features/users";
import { getSupportedCurrencies, CURRENCY_SYMBOLS, CURRENCY_NAMES } from "@/lib/shared/currency";
import { setClientCurrencyPreference } from "@/lib/shared/client-currency";

interface SettingsContentProps {
  user: User;
}

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const settingSections: SettingsSection[] = [
  {
    id: "profile",
    title: "Profile",
    description: "Manage your personal information and account details",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
  },
  {
    id: "preferences",
    title: "Preferences",
    description: "Customize your application experience and display settings",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
        />
      </svg>
    ),
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Control how and when you receive notifications",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-5 5v-5zM5.07 19H9l4-7h2l4 7h3.93A10 10 0 1012 2v5l8 7-8 3z"
        />
      </svg>
    ),
  },
  {
    id: "security",
    title: "Security",
    description: "Manage your password, security settings, and privacy options",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
  },
  {
    id: "data",
    title: "Data & Export",
    description: "Export your data and manage data retention settings",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
];

export default function SettingsContent({ user }: SettingsContentProps) {
  const [activeSection, setActiveSection] = useState("profile");
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(
    user.preferred_currency || 'GBP'
  );
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [currencyMessage, setCurrencyMessage] = useState<string | null>(null);

  const handleCurrencyChange = async (newCurrency: Currency) => {
    if (newCurrency === selectedCurrency) return;
    
    setSavingCurrency(true);
    setCurrencyMessage(null);
    
    try {
      const result = await updateUserCurrencyPreference(newCurrency);
      
      if (result.success) {
        setSelectedCurrency(newCurrency);
        // Also store client-side as backup
        setClientCurrencyPreference(newCurrency);
        setCurrencyMessage(`Currency preference updated to ${CURRENCY_NAMES[newCurrency]}`);
        // Clear message after 3 seconds
        setTimeout(() => setCurrencyMessage(null), 3000);
      } else {
        setCurrencyMessage(`Failed to update currency: ${result.error}`);
        setTimeout(() => setCurrencyMessage(null), 5000);
      }
    } catch (error) {
      setCurrencyMessage("Failed to update currency preference");
      setTimeout(() => setCurrencyMessage(null), 5000);
    } finally {
      setSavingCurrency(false);
    }
  };

  const renderProfileSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Profile Information</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Update your personal information and account details.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email Address
          </label>
          <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md">
            <span className="text-sm text-gray-900 dark:text-white">{user.email}</span>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Email address cannot be changed
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Display Name
          </label>
          <input
            type="text"
            defaultValue={`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter your display name"
          />
        </div>
      </div>

      <div className="pt-4">
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
          Save Changes
        </button>
      </div>
    </div>
  );

  const renderPreferencesSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Application Preferences
        </h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Customize how the application looks and behaves.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Theme</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Choose between light and dark mode
            </p>
          </div>
          <ThemeToggle />
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                Currency Display
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Default currency format for financial data
              </p>
            </div>
            <div className="flex flex-col items-end">
              <select 
                value={selectedCurrency}
                onChange={(e) => handleCurrencyChange(e.target.value as Currency)}
                disabled={savingCurrency}
                className="block w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm disabled:opacity-50"
              >
                {getSupportedCurrencies().map((currency) => (
                  <option key={currency} value={currency}>
                    {currency} ({CURRENCY_SYMBOLS[currency]})
                  </option>
                ))}
              </select>
              {currencyMessage && (
                <p className={`text-xs mt-1 ${
                  currencyMessage.includes('Failed') 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-green-600 dark:text-green-400'
                }`}>
                  {currencyMessage}
                </p>
              )}
              {savingCurrency && (
                <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                  Saving...
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Date Format</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                How dates should be displayed throughout the app
              </p>
            </div>
            <select className="block w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                Auto-categorization
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Automatically categorize transactions based on patterns
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationsSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Notification Preferences
        </h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Choose when and how you want to be notified.
        </p>
      </div>

      <div className="space-y-4">
        {[
          {
            title: "Transaction Alerts",
            description: "Get notified about new transactions and unusual activity",
            enabled: true,
          },
          {
            title: "Budget Warnings",
            description: "Receive alerts when you're approaching budget limits",
            enabled: true,
          },
          {
            title: "Monthly Reports",
            description: "Get monthly financial summary reports via email",
            enabled: false,
          },
          {
            title: "Security Alerts",
            description: "Important security-related notifications",
            enabled: true,
          },
        ].map((notification, index) => (
          <div
            key={index}
            className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
          >
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                {notification.title}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{notification.description}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                defaultChecked={notification.enabled}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSecuritySection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Security Settings</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Manage your account security and privacy settings.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Password</h4>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
            Change Password
          </button>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Two-Factor Authentication
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Add an extra layer of security to your account
          </p>
          <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
            Enable 2FA
          </button>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Account Access</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            View recent login activity and manage active sessions
          </p>
          <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
            View Login History
          </button>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-3">Danger Zone</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Permanently delete your account and all associated data
          </p>
          <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );

  const renderDataSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Data Management</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Export your data and manage data retention preferences.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Export Data</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Download a copy of your financial data in various formats
          </p>
          <div className="space-y-2">
            <button className="block w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
              Export as CSV
            </button>
            <button className="block w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors sm:ml-2">
              Export as JSON
            </button>
            <button className="block w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors sm:ml-2">
              Export as PDF Report
            </button>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Data Retention</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Choose how long to keep your transaction data
          </p>
          <select
            defaultValue="5years"
            className="block w-full sm:w-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="1year">1 Year</option>
            <option value="2years">2 Years</option>
            <option value="5years">5 Years</option>
            <option value="forever">Keep Forever</option>
          </select>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Data Import</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Import data from other financial management tools
          </p>
          <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
            Import Data
          </button>
        </div>
      </div>
    </div>
  );

  const renderActiveSection = () => {
    switch (activeSection) {
      case "profile":
        return renderProfileSection();
      case "preferences":
        return renderPreferencesSection();
      case "notifications":
        return renderNotificationsSection();
      case "security":
        return renderSecuritySection();
      case "data":
        return renderDataSection();
      default:
        return renderProfileSection();
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Settings Navigation */}
      <div className="lg:w-64 flex-shrink-0">
        <nav className="space-y-1">
          {settingSections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeSection === section.id
                  ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <div className="flex items-center">
                <span className="mr-3">{section.icon}</span>
                <div>
                  <div className="font-medium">{section.title}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                    {section.description}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Settings Content */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        {renderActiveSection()}
      </div>
    </div>
  );
}
