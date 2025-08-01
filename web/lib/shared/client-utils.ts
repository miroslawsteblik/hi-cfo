// Client-side only utilities to prevent hydration issues
"use client";

import { useEffect, useState } from "react";

// Hook to prevent hydration mismatch for date formatting
export const useFormattedDate = (dateString: string) => {
  const [formattedDate, setFormattedDate] = useState<string | null>(null);
  
  useEffect(() => {
    const date = new Date(dateString);
    const formatted = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    setFormattedDate(formatted);
  }, [dateString]);
  
  // Return a placeholder during SSR, actual date after hydration
  return formattedDate || "Loading...";
};

// Hook to prevent hydration mismatch for currency formatting
export const useFormattedCurrency = (amount: number, currency: string = "GBP") => {
  const [formattedCurrency, setFormattedCurrency] = useState<string | null>(null);
  
  useEffect(() => {
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(Math.abs(amount));
    setFormattedCurrency(formatted);
  }, [amount, currency]);
  
  return formattedCurrency || "Loading...";
};