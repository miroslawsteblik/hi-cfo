// Utility methods for date formatting
export function formatDateForAPI(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function getPreviousMonth(): string {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
}

export function getDateRange(months: number = 12): { start_date: string; end_date: string } {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - months);

  return {
    start_date: formatDateForAPI(start),
    end_date: formatDateForAPI(end),
  };
}


import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Re-export currency utilities for backward compatibility
export { 
  getUserPrimaryCurrency,
  formatCurrency,
  getUserPreferredCurrency,
  convertCurrency,
  formatCurrencyWithConversion
} from './currency';

export const formatDate = (dateString: string) => {
  try {
    // Handle ISO date strings consistently
    const date = new Date(dateString);
    
    // Ensure we have a valid date
    if (isNaN(date.getTime())) {
      return dateString; // Return original if invalid
    }
    
    // Use consistent formatting that works the same on server and client
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // For consistent hydration, use UTC methods to avoid timezone differences
    const month = months[date.getUTCMonth()];
    const day = date.getUTCDate();
    const year = date.getUTCFullYear();
    
    return `${month} ${day}, ${year}`;
  } catch (error) {
    return dateString; // Return original string if formatting fails
  }
};