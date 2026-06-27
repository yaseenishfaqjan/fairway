import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, isValid } from 'date-fns';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : (value ?? 0);
  if (Number.isNaN(n)) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export function formatNumber(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : (value ?? 0);
  return new Intl.NumberFormat('en-US').format(Number.isNaN(n) ? 0 : n);
}

/** Parse a YYYY-MM-DD or ISO string safely; returns null on failure. */
function safeDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = value.length === 10 ? parseISO(value + 'T00:00:00') : parseISO(value);
  return isValid(d) ? d : null;
}

export function formatDate(value: string | null | undefined, fmt = 'MMM d, yyyy'): string {
  const d = safeDate(value);
  return d ? format(d, fmt) : '—';
}

export function formatDateTime(value: string | null | undefined): string {
  const d = safeDate(value);
  return d ? format(d, 'MMM d, yyyy • h:mm a') : '—';
}

/** Format a HH:mm:ss time string into 12-hour display. */
export function formatTime(value: string | null | undefined): string {
  if (!value) return '—';
  const [h, m] = value.split(':');
  const hour = Number(h);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${m} ${suffix}`;
}

export function initials(first?: string | null, last?: string | null): string {
  return `${(first?.[0] ?? '').toUpperCase()}${(last?.[0] ?? '').toUpperCase()}` || '?';
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}
