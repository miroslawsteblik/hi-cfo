// Currency utilities with static FX rates
import type { Currency } from './types';

// Static FX rates (base: GBP = 1.0)
// Updated periodically - these are approximate rates
export const STATIC_FX_RATES: Record<Currency, number> = {
  GBP: 1.0,        // Base currency
  USD: 1.27,       // 1 GBP = 1.27 USD
  EUR: 1.20,       // 1 GBP = 1.20 EUR  
  PLN: 5.12,       // 1 GBP = 5.12 PLN
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  GBP: '£',
  USD: '$',
  EUR: '€',
  PLN: 'zł',
};

export const CURRENCY_NAMES: Record<Currency, string> = {
  GBP: 'British Pound',
  USD: 'US Dollar',
  EUR: 'Euro',
  PLN: 'Polish Złoty',
};

// Get user's preferred currency (with fallback hierarchy)
export const getUserPreferredCurrency = (
  userPreference?: Currency,
  accountCurrencies?: Currency[],
  transactionCurrencies?: Currency[]
): Currency => {
  // 1. User preference overrides everything
  if (userPreference && Object.keys(STATIC_FX_RATES).includes(userPreference)) {
    return userPreference;
  }
  
  // 2. Most common account currency
  if (accountCurrencies?.length) {
    const currencyCount = accountCurrencies.reduce((acc, currency) => {
      acc[currency] = (acc[currency] || 0) + 1;
      return acc;
    }, {} as Record<Currency, number>);
    
    const mostCommon = Object.entries(currencyCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] as Currency;
    
    if (mostCommon && Object.keys(STATIC_FX_RATES).includes(mostCommon)) {
      return mostCommon;
    }
  }
  
  // 3. Most common transaction currency
  if (transactionCurrencies?.length) {
    const currencyCount = transactionCurrencies.reduce((acc, currency) => {
      acc[currency] = (acc[currency] || 0) + 1;
      return acc;
    }, {} as Record<Currency, number>);
    
    const mostCommon = Object.entries(currencyCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] as Currency;
    
    if (mostCommon && Object.keys(STATIC_FX_RATES).includes(mostCommon)) {
      return mostCommon;
    }
  }
  
  // 4. Default fallback
  return 'GBP';
};

// Convert amount from one currency to another
export const convertCurrency = (
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency
): number => {
  if (fromCurrency === toCurrency) return amount;
  
  // Convert to GBP first (base currency)
  const gbpAmount = amount / STATIC_FX_RATES[fromCurrency];
  
  // Then convert to target currency
  return gbpAmount * STATIC_FX_RATES[toCurrency];
};

// Format currency with proper symbol and locale
export const formatCurrency = (
  amount: number,
  currency: Currency = 'GBP',
  options: {
    showSymbol?: boolean;
    showCode?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {}
): string => {
  const {
    showSymbol = true,
    showCode = false,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2
  } = options;

  // Format the number
  const formatted = new Intl.NumberFormat('en-GB', {
    style: showSymbol ? 'currency' : 'decimal',
    currency: currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(Math.abs(amount));

  // Add currency code if requested
  if (showCode && !showSymbol) {
    return `${formatted} ${currency}`;
  }
  
  return formatted;
};

// Format currency with conversion
export const formatCurrencyWithConversion = (
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  showOriginal: boolean = false
): string => {
  const convertedAmount = convertCurrency(amount, fromCurrency, toCurrency);
  const formatted = formatCurrency(convertedAmount, toCurrency);
  
  if (showOriginal && fromCurrency !== toCurrency) {
    const originalFormatted = formatCurrency(amount, fromCurrency);
    return `${formatted} (${originalFormatted})`;
  }
  
  return formatted;
};

// Get exchange rate between two currencies
export const getExchangeRate = (fromCurrency: Currency, toCurrency: Currency): number => {
  if (fromCurrency === toCurrency) return 1;
  return STATIC_FX_RATES[toCurrency] / STATIC_FX_RATES[fromCurrency];
};

// Validate if currency is supported
export const isSupportedCurrency = (currency: string): currency is Currency => {
  return Object.keys(STATIC_FX_RATES).includes(currency);
};

// Get all supported currencies
export const getSupportedCurrencies = (): Currency[] => {
  return Object.keys(STATIC_FX_RATES) as Currency[];
};

// Legacy compatibility - keep the old function name but with improved logic
export const getUserPrimaryCurrency = (accounts?: any[]): Currency => {
  if (!accounts || accounts.length === 0) return 'GBP';
  
  const currencies = accounts
    .map(account => account.currency)
    .filter(currency => currency && isSupportedCurrency(currency)) as Currency[];
  
  return getUserPreferredCurrency(undefined, currencies);
};