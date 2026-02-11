import { describe, it, expect } from 'vitest';
import { extractDomain, formatPercent, formatNumber, dateToString, daysAgo } from '@/lib/utils';

describe('extractDomain', () => {
  it('extracts domain from a URL', () => {
    expect(extractDomain('https://example.com/page')).toBe('example.com');
  });

  it('strips www prefix', () => {
    expect(extractDomain('https://www.example.com/page')).toBe('example.com');
  });

  it('preserves subdomains other than www', () => {
    expect(extractDomain('https://blog.example.com/post')).toBe('blog.example.com');
  });

  it('returns original string for invalid URLs', () => {
    expect(extractDomain('not-a-url')).toBe('not-a-url');
  });

  it('handles URLs with ports', () => {
    expect(extractDomain('https://example.com:8080/page')).toBe('example.com');
  });
});

describe('formatPercent', () => {
  it('formats with default 1 decimal place', () => {
    expect(formatPercent(75.5)).toBe('75.5%');
  });

  it('formats with specified decimal places', () => {
    expect(formatPercent(75.567, 2)).toBe('75.57%');
  });

  it('formats whole numbers', () => {
    expect(formatPercent(100)).toBe('100.0%');
  });
});

describe('formatNumber', () => {
  it('formats numbers with commas', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1000000)).toBe('1,000,000');
  });

  it('handles small numbers', () => {
    expect(formatNumber(5)).toBe('5');
  });
});

describe('dateToString', () => {
  it('converts date to YYYY-MM-DD string', () => {
    const date = new Date('2025-01-15T12:00:00Z');
    expect(dateToString(date)).toBe('2025-01-15');
  });
});

describe('daysAgo', () => {
  it('returns a date N days in the past', () => {
    const now = new Date();
    const result = daysAgo(7);
    const diffMs = now.getTime() - result.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(7);
  });

  it('returns today for 0 days ago', () => {
    const now = new Date();
    const result = daysAgo(0);
    expect(result.toDateString()).toBe(now.toDateString());
  });
});
