import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function dateToString(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

/**
 * Convert a date string like "2026-02-12" to a UTC upper bound.
 *
 * The frontend sends dates in the user's local timezone but the DB
 * stores timestamps in UTC.  A user who picks "Feb 12" expects to
 * see data through the end of Feb 12 in their timezone.  In the
 * worst case (UTC-12) that is Feb 13 12:00 UTC, so we use the
 * start-of-day two days after the given date.  This is a safe
 * ceiling — all queries already filter by project, so a few extra
 * hours of overlap are harmless and far better than missing data.
 */
export function endOfDateRange(dateStr: string): Date {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + 2);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
