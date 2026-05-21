import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// BUG-17 fix: proper currency formatting — pehle sirf "1000 INR" dikhata tha, ab ₹1,000 dikhega
export const formatCurrency = (amount: number, currency = 'INR') => {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // Fallback agar currency code invalid ho
    return `${currency} ${amount.toLocaleString('en-IN')}`;
  }
};
