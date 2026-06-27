import { create } from 'zustand';
import { api, setAccessToken, setAuthFailureHandler } from '@/lib/api';
import type { AuthUser } from '@/lib/types';
import { ROLE_RANK, type Role } from '@/lib/constants';

interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

interface AuthState {
  user: AuthUser | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  bootstrap: () => Promise<void>;
  setUser: (user: AuthUser) => void;
  hasRole: (...roles: Role[]) => boolean;
  hasMinRole: (min: Role) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: 'idle',

  login: async (email, password) => {
    const res = await api.post<LoginResponse>('/auth/login', { email, password });
    setAccessToken(res.data.accessToken);
    set({ user: res.data.user, status: 'authenticated' });
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore network errors on logout
    }
    setAccessToken(null);
    set({ user: null, status: 'unauthenticated' });
  },

  // On app load, try to restore a session from the httpOnly refresh cookie.
  bootstrap: async () => {
    set({ status: 'loading' });
    try {
      const res = await api.post<LoginResponse>('/auth/refresh', {});
      setAccessToken(res.data.accessToken);
      set({ user: res.data.user, status: 'authenticated' });
    } catch {
      setAccessToken(null);
      set({ user: null, status: 'unauthenticated' });
    }
  },

  setUser: (user) => set({ user }),

  hasRole: (...roles) => {
    const role = get().user?.role;
    return !!role && roles.includes(role);
  },

  hasMinRole: (min) => {
    const role = get().user?.role;
    return !!role && ROLE_RANK[role] >= ROLE_RANK[min];
  },
}));

// When refresh fails inside the axios interceptor, force logout state.
setAuthFailureHandler(() => {
  setAccessToken(null);
  useAuthStore.setState({ user: null, status: 'unauthenticated' });
});
