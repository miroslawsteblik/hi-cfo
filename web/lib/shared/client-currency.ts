"use client";

import { Currency } from './types';

// Client-side currency preference management
// This provides a fallback for when server-side cookies aren't available

const CURRENCY_STORAGE_KEY = 'user_currency_preference';

export const getClientCurrencyPreference = (): Currency | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    return localStorage.getItem(CURRENCY_STORAGE_KEY) as Currency;
  } catch {
    return null;
  }
};

export const setClientCurrencyPreference = (currency: Currency): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
  } catch {
    // Ignore localStorage errors
  }
};

export const clearClientCurrencyPreference = (): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(CURRENCY_STORAGE_KEY);
  } catch {
    // Ignore localStorage errors
  }
};