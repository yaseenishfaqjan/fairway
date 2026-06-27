import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  variant: ToastVariant;
  message: string;
}

interface UiState {
  theme: 'dark' | 'light';
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  toasts: Toast[];
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setMobileNav: (open: boolean) => void;
  toast: (message: string, variant?: ToastVariant) => void;
  dismissToast: (id: string) => void;
}

const THEME_KEY = 'fairway-theme';
const COLLAPSE_KEY = 'fairway-sidebar';

function applyTheme(theme: 'dark' | 'light') {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}

const initialTheme: 'dark' | 'light' =
  (localStorage.getItem(THEME_KEY) as 'dark' | 'light' | null) ?? 'dark';
applyTheme(initialTheme);

export const useUiStore = create<UiState>((set, get) => ({
  theme: initialTheme,
  sidebarCollapsed: localStorage.getItem(COLLAPSE_KEY) === '1',
  mobileNavOpen: false,
  toasts: [],

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem(THEME_KEY, next);
    set({ theme: next });
  },

  toggleSidebar: () => {
    const next = !get().sidebarCollapsed;
    localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
    set({ sidebarCollapsed: next });
  },

  setMobileNav: (open) => set({ mobileNavOpen: open }),

  toast: (message, variant = 'info') => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { id, message, variant }] }));
    setTimeout(() => get().dismissToast(id), 4000);
  },

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
