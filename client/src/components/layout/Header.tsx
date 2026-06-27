import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Menu, Bell, Sun, Moon, LogOut, ChevronDown, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { Avatar } from '@/components/ui';
import { ROLE_LABELS } from '@/lib/constants';
import { formatDateTime } from '@/lib/utils';
import type { AppNotification } from '@/lib/types';

function useOutsideClick<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);
  return ref;
}

function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const ref = useOutsideClick<HTMLDivElement>(() => setOpen(false));
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get<AppNotification[]>('/notifications')).data,
    refetchInterval: 60_000,
  });

  const markAll = useMutation({
    mutationFn: () => api.put('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const markOne = useMutation({
    mutationFn: (id: string) => api.put(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const items = data ?? [];
  const unread = items.filter((n) => !n.isRead).length;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="btn-ghost relative p-2" aria-label="Notifications">
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-fairway-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="card absolute right-0 z-50 mt-2 w-80 animate-slide-up">
          <div className="flex items-center justify-between border-b border-night-800 px-4 py-3">
            <span className="font-display text-sm font-bold text-white">Notifications</span>
            {unread > 0 && (
              <button onClick={() => markAll.mutate()} className="text-xs text-fairway-400 hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-night-400">You're all caught up.</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.isRead) markOne.mutate(n.id);
                    if (n.actionUrl) {
                      navigate(n.actionUrl);
                      setOpen(false);
                    }
                  }}
                  className="flex w-full gap-3 border-b border-night-800/60 px-4 py-3 text-left hover:bg-night-800/50"
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? 'bg-transparent' : 'bg-fairway-500'}`}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-night-100">{n.title}</p>
                    <p className="text-xs text-night-400">{n.message}</p>
                    <p className="mt-0.5 text-[11px] text-night-500">{formatDateTime(n.createdAt)}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClick<HTMLDivElement>(() => setOpen(false));
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 rounded-xl px-1.5 py-1 hover:bg-night-800">
        <Avatar first={user.firstName} last={user.lastName} url={user.avatarUrl} size="sm" />
        <span className="hidden text-sm font-medium text-night-100 sm:block">
          {user.firstName} {user.lastName}
        </span>
        <ChevronDown className="hidden h-4 w-4 text-night-400 sm:block" />
      </button>
      {open && (
        <div className="card absolute right-0 z-50 mt-2 w-56 animate-slide-up">
          <div className="border-b border-night-800 px-4 py-3">
            <p className="truncate text-sm font-semibold text-white">
              {user.firstName} {user.lastName}
            </p>
            <p className="truncate text-xs text-night-400">{user.email}</p>
            <span className="mt-1 inline-flex items-center gap-1 text-xs text-fairway-400">
              <Check className="h-3 w-3" /> {ROLE_LABELS[user.role]}
            </span>
          </div>
          <div className="p-1.5">
            <button
              onClick={() => {
                setOpen(false);
                navigate('/settings');
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-night-200 hover:bg-night-800"
            >
              Settings
            </button>
            <button
              onClick={() => logout()}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-300 hover:bg-night-800"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Header({ title }: { title: string }) {
  const setMobileNav = useUiStore((s) => s.setMobileNav);
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-night-800 bg-night-950/80 px-4 backdrop-blur lg:px-6">
      <button onClick={() => setMobileNav(true)} className="btn-ghost p-2 lg:hidden" aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>
      <h1 className="heading text-lg lg:text-xl">{title}</h1>
      <div className="ml-auto flex items-center gap-1">
        <button onClick={toggleTheme} className="btn-ghost p-2" aria-label="Toggle theme">
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <NotificationsMenu />
        <UserMenu />
      </div>
    </header>
  );
}
