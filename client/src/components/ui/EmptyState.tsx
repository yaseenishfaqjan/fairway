import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({
  icon: Icon = Inbox,
  title,
  message,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-night-800 text-night-400">
        <Icon className="h-7 w-7" />
      </div>
      <div>
        <h3 className="font-display text-base font-semibold text-white">{title}</h3>
        {message && <p className="mt-1 max-w-sm text-sm text-night-400">{message}</p>}
      </div>
      {action}
    </div>
  );
}
