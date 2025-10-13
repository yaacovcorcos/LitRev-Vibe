import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind and custom class names while respecting shadcn/ui variants.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
