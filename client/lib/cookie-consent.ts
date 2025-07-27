export interface CookieConsent {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: number;
  version: string;
}

export const COOKIE_CATEGORIES = {
  essential: {
    name: 'Essential Cookies',
    description: 'Required for authentication, security, and basic functionality. These cannot be disabled.',
    required: true,
    cookies: ['auth_token', 'refresh_token', 'session_id', 'csrf_token']
  },
  functional: {
    name: 'Functional Cookies',
    description: 'Remember your preferences and settings to improve your experience.',
    required: false,
    cookies: ['theme_preference', 'language_setting', 'dashboard_layout']
  },
  analytics: {
    name: 'Analytics Cookies',
    description: 'Help us understand how you use our app to improve performance and features.',
    required: false,
    cookies: ['_ga', '_gid', 'analytics_session']
  },
  marketing: {
    name: 'Marketing Cookies',
    description: 'Used to deliver relevant content and track marketing campaign effectiveness.',
    required: false,
    cookies: ['marketing_id', 'campaign_tracker']
  }
} as const;

export const DEFAULT_CONSENT: CookieConsent = {
  essential: true, // Always required
  functional: false,
  analytics: false,
  marketing: false,
  timestamp: Date.now(),
  version: '1.0'
};

// Client-side cookie functions (for browser)
export function getCookieConsentClient(): CookieConsent | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith('cookie_consent='))
      ?.split('=')[1];
    
    if (cookieValue) {
      return JSON.parse(decodeURIComponent(cookieValue));
    }
  } catch (error) {
    console.error('Failed to parse cookie consent:', error);
  }
  
  return null;
}

export function setCookieConsentClient(consent: CookieConsent): void {
  if (typeof window === 'undefined') return;
  
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1); // 1 year
  
  const cookieString = `cookie_consent=${encodeURIComponent(JSON.stringify(consent))}; expires=${expires.toUTCString()}; path=/; SameSite=strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
  
  document.cookie = cookieString;
}

export function hasValidConsent(consent: CookieConsent | null): boolean {
  if (!consent) return false;
  
  // Check if consent is recent (within 1 year)
  const oneYear = 365 * 24 * 60 * 60 * 1000;
  const isRecent = Date.now() - consent.timestamp < oneYear;
  
  // Check if consent version is current
  const isCurrentVersion = consent.version === DEFAULT_CONSENT.version;
  
  return isRecent && isCurrentVersion;
}