import { cn } from '@/lib/utils';
import { initials } from '@/lib/utils';

export function Avatar({
  first,
  last,
  url,
  size = 'md',
  className,
}: {
  first?: string | null;
  last?: string | null;
  url?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-lg',
  };
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className={cn('rounded-full object-cover', sizes[size], className)}
      />
    );
  }
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-fairway-500/20 font-semibold text-fairway-300',
        sizes[size],
        className,
      )}
    >
      {initials(first, last)}
    </div>
  );
}
