import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Default to INR as per user preference for Indian stocks
export function formatCurrency(value: number, currency: string = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatNumber(num: number) {
  return new Intl.NumberFormat('en-IN', {
    notation: "compact",
    compactDisplay: "short"
  }).format(num);
}