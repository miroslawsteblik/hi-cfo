// components/transactions/TransactionSettings.tsx
"use client";

import { useState, useEffect } from "react";
import { CategorizationSettings } from "@/lib/types/transactions";
import {
  getCategorizationSettings,
  updateCategorizationSettings,
} from "@/lib/actions/transactions";

interface TransactionSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TransactionSettings({ isOpen, onClose }: TransactionSettingsProps) {
  const [settings, setSettings] = useState<CategorizationSettings>({
    confidence_threshold: 0.7,
    auto_categorize_on_upload: true,
    enabled_methods: ["exact_match", "fuzzy_match", "keyword_match"],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // User preferences (stored in localStorage for now)
  const [userPrefs, setUserPrefs] = useState({
    defaultPageSize: 20,
    dateFormat: "MM/dd/yyyy",
    currency: "USD",
    showMerchantNames: true,
    showTags: true,
    compactView: false,
    autoRefresh: false,
    theme: "light",
  });

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      loadUserPreferences();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const result = await getCategorizationSettings();
      if (result.success && result.data) {
        setSettings(result.data);
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadUserPreferences = () => {
    try {
      const saved = localStorage.getItem("transaction-preferences");
      if (saved) {
        setUserPrefs({ ...userPrefs, ...JSON.parse(saved) });
      }
    } catch (err) {
      console.error("Failed to load user preferences:", err);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setError(null);

    try {
      const result = await updateCategorizationSettings(settings);
      if (result.success) {
        setSuccessMessage("Settings saved successfully!");
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || "Failed to save settings");
      }
    } catch (err) {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const saveUserPreferences = () => {
    try {
      localStorage.setItem("transaction-preferences", JSON.stringify(userPrefs));
      setSuccessMessage("Preferences saved!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError("Failed to save preferences");
    }
  };

  const handleClose = () => {
    saveUserPreferences();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Transaction Settings
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Success/Error Messages */}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
              {successMessage}
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading settings...</span>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Auto-Categorization Settings */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Auto-Categorization
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Auto-categorize on upload
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Automatically categorize transactions when importing OFX files
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.auto_categorize_on_upload}
                        onChange={(e) =>
                          setSettings({ ...settings, auto_categorize_on_upload: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confidence threshold: {Math.round(settings.confidence_threshold * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.1"
                      value={settings.confidence_threshold}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          confidence_threshold: parseFloat(e.target.value),
                        })
                      }
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Low (10%)</span>
                      <span>High (100%)</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Only apply automatic categories with confidence above this threshold
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categorization methods
                    </label>
                    <div className="space-y-2">
                      {[
                        {
                          key: "exact_match",
                          label: "Exact Match",
                          desc: "Match exact merchant names",
                        },
                        {
                          key: "fuzzy_match",
                          label: "Fuzzy Match",
                          desc: "Match similar merchant names",
                        },
                        {
                          key: "keyword_match",
                          label: "Keyword Match",
                          desc: "Match by keywords in description",
                        },
                      ].map((method) => (
                        <label key={method.key} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={settings.enabled_methods.includes(method.key)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSettings({
                                  ...settings,
                                  enabled_methods: [...settings.enabled_methods, method.key],
                                });
                              } else {
                                setSettings({
                                  ...settings,
                                  enabled_methods: settings.enabled_methods.filter(
                                    (m) => m !== method.key
                                  ),
                                });
                              }
                            }}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300"
                          />
                          <div className="ml-3">
                            <span className="text-sm font-medium text-gray-700">
                              {method.label}
                            </span>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {method.desc}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Display Preferences */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Display Preferences
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Default page size
                    </label>
                    <select
                      value={userPrefs.defaultPageSize}
                      onChange={(e) =>
                        setUserPrefs({ ...userPrefs, defaultPageSize: parseInt(e.target.value) })
                      }
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value={10}>10 transactions</option>
                      <option value={20}>20 transactions</option>
                      <option value={50}>50 transactions</option>
                      <option value={100}>100 transactions</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date format
                    </label>
                    <select
                      value={userPrefs.dateFormat}
                      onChange={(e) => setUserPrefs({ ...userPrefs, dateFormat: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="MM/dd/yyyy">MM/dd/yyyy (US)</option>
                      <option value="dd/MM/yyyy">dd/MM/yyyy (UK)</option>
                      <option value="yyyy-MM-dd">yyyy-MM-dd (ISO)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Default currency
                    </label>
                    <select
                      value={userPrefs.currency}
                      onChange={(e) => setUserPrefs({ ...userPrefs, currency: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="CAD">CAD (C$)</option>
                    </select>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="compactView"
                      checked={userPrefs.compactView}
                      onChange={(e) =>
                        setUserPrefs({ ...userPrefs, compactView: e.target.checked })
                      }
                      className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    />
                    <label htmlFor="compactView" className="ml-2 text-sm text-gray-700">
                      Compact table view
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="showMerchant"
                      checked={userPrefs.showMerchantNames}
                      onChange={(e) =>
                        setUserPrefs({ ...userPrefs, showMerchantNames: e.target.checked })
                      }
                      className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    />
                    <label htmlFor="showMerchant" className="ml-2 text-sm text-gray-700">
                      Show merchant names
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="showTags"
                      checked={userPrefs.showTags}
                      onChange={(e) => setUserPrefs({ ...userPrefs, showTags: e.target.checked })}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    />
                    <label htmlFor="showTags" className="ml-2 text-sm text-gray-700">
                      Show transaction tags
                    </label>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 pt-6 border-t">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
