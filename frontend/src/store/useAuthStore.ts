import { create } from 'zustand';

export type Role = 'STUDENT' | 'ORGANIZER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  isAuthenticated: !!(typeof window !== 'undefined' && localStorage.getItem('token')),
  isLoading: true,
  login: (user, token) => {
    localStorage.setItem('token', token);
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },
  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      // Simplified check, could call /api/auth/me
      set({ isLoading: true });
      // We'll rely on the API interceptor to handle 401s
      // If we have a token, we consider ourselves potentially authenticated
      // The first request will confirm it
      set({ isAuthenticated: true, isLoading: false });
    } catch (error) {
      localStorage.removeItem('token');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
