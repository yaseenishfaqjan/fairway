import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { humanize } from '@/lib/constants';

type Tone = 'green' | 'red' | 'amber' | 'blue' | 'slate' | 'purple';

const toneClass: Record<Tone, string> = {
  green: 'bg-fairway-500/15 text-fairway-300',
  red: 'bg-red-500/15 text-red-300',
  amber: 'bg-amber-500/15 text-amber-300',
  blue: 'bg-sky-500/15 text-sky-300',
  slate: 'bg-night-700/60 text-night-200',
  purple: 'bg-purple-500/15 text-purple-300',
};

export function Badge({
  tone = 'slate',
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return <span className={cn('badge', toneClass[tone], className)}>{children}</span>;
}

// Maps domain statuses to tones so colours stay consistent across the app.
const STATUS_TONE: Record<string, Tone> = {
  // membership / generic
  active: 'green',
  confirmed: 'green',
  completed: 'green',
  resolved: 'green',
  registration_open: 'green',
  available: 'green',
  suspended: 'amber',
  pending: 'amber',
  in_progress: 'amber',
  deferred: 'amber',
  upcoming: 'blue',
  booked: 'blue',
  cancelled: 'red',
  no_show: 'red',
  blocked: 'red',
  maintenance: 'amber',
  // priorities
  low: 'slate',
  medium: 'blue',
  high: 'amber',
  critical: 'red',
};

export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <Badge tone="slate">—</Badge>;
  return <Badge tone={STATUS_TONE[status] ?? 'slate'}>{humanize(status)}</Badge>;
}
