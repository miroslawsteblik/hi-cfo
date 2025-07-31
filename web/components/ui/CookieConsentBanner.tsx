"use client";

import { useState, useEffect } from 'react';
import { CookieConsent, COOKIE_CATEGORIES, DEFAULT_CONSENT, getCookieConsentClient, setCookieConsentClient, hasValidConsent } from '@/lib/shared/cookie-consent';

export default function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [consent, setConsent] = useState<CookieConsent>(DEFAULT_CONSENT);

  useEffect(() => {
    checkConsentStatus();
  }, []);

  const checkConsentStatus = () => {
    try {
      // Check if consent already exists
      const existingConsent = getCookieConsentClient();
      
      if (!hasValidConsent(existingConsent)) {
        setShowBanner(true);
      }
    } catch (error) {
      console.error('Failed to check consent status:', error);
      setShowBanner(true);
    }
  };

  const handleAcceptAll = () => {
    const fullConsent: CookieConsent = {
      essential: true,
      functional: true,
      analytics: true,
      marketing: true,
      timestamp: Date.now(),
      version: DEFAULT_CONSENT.version
    };

    try {
      setCookieConsentClient(fullConsent);
      setShowBanner(false);
    } catch (error) {
      console.error('Failed to save consent:', error);
    }
  };

  const handleAcceptEssential = () => {
    try {
      const essentialConsent = {
        ...DEFAULT_CONSENT,
        timestamp: Date.now()
      };
      setCookieConsentClient(essentialConsent);
      setShowBanner(false);
    } catch (error) {
      console.error('Failed to save consent:', error);
    }
  };

  const handleSaveCustom = () => {
    const customConsent: CookieConsent = {
      ...consent,
      essential: true, // Always required
      timestamp: Date.now(),
      version: DEFAULT_CONSENT.version
    };

    try {
      setCookieConsentClient(customConsent);
      setShowBanner(false);
    } catch (error) {
      console.error('Failed to save consent:', error);
    }
  };

  const updateConsent = (category: keyof Omit<CookieConsent, 'timestamp' | 'version'>, value: boolean) => {
    if (category === 'essential') return; // Essential cookies cannot be disabled
    
    setConsent(prev => ({
      ...prev,
      [category]: value
    }));
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-7xl mx-auto p-4">
        {!showDetails ? (
          // Simple Banner
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                🍪 Your Privacy Matters
              </h3>
              <p className="text-sm text-gray-600">
                We use essential cookies for security and authentication, plus optional cookies to improve your experience. 
                As a financial application, we prioritize your privacy and data protection.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 min-w-fit">
              <button
                onClick={() => setShowDetails(true)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Manage Cookies
              </button>
              <button
                onClick={handleAcceptEssential}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Essential Only
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                Accept All
              </button>
            </div>
          </div>
        ) : (
          // Detailed Settings
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Cookie Preferences
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {Object.entries(COOKIE_CATEGORIES).map(([key, category]) => {
                const categoryKey = key as keyof Omit<CookieConsent, 'timestamp' | 'version'>;
                const isChecked = consent[categoryKey];
                const isRequired = category.required;
                
                return (
                  <div key={key} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-gray-900">
                            {category.name}
                          </h4>
                          {isRequired && (
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                              Required
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {category.description}
                        </p>
                        <details className="text-xs text-gray-500">
                          <summary className="cursor-pointer hover:text-gray-700">
                            Cookie details
                          </summary>
                          <div className="mt-1 pl-4">
                            <strong>Cookies used:</strong> {category.cookies.join(', ')}
                          </div>
                        </details>
                      </div>
                      
                      <div className="ml-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isRequired}
                            onChange={(e) => updateConsent(categoryKey, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className={`w-11 h-6 rounded-full peer transition-colors duration-200 ease-in-out ${
                            isRequired 
                              ? 'bg-gray-400 cursor-not-allowed' 
                              : 'bg-gray-200 peer-checked:bg-blue-600 peer-focus:ring-4 peer-focus:ring-blue-300'
                          }`}>
                            <div className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform duration-200 ease-in-out ${
                              isChecked ? 'translate-x-full' : ''
                            }`}></div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                onClick={handleAcceptEssential}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Essential Only
              </button>
              <button
                onClick={handleSaveCustom}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                Save Preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}