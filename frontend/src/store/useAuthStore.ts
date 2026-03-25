"use client";

import { create } from "zustand";
import { apiFetch } from "@/lib/api";

export type AuthUser = {
  id: string;
  username?: string;
  name: string;
  email: string;
  role: "STUDENT" | "ORGANIZER" | "ADMIN";
  isReadOnly?: boolean;
};

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  refreshSession: () => Promise<void>;
  signIn: (identifier: string, password: string) => Promise<void>;
  signInDemo: () => Promise<void>;
  signUp: (payload: {
    username?: string;
    name: string;
    email: string;
    password: string;
    role?: "STUDENT" | "ORGANIZER";
  }) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: Boolean(user) }),
  setLoading: (loading) => set({ loading }),
  refreshSession: async () => {
    try {
      const response = await apiFetch<{ user: AuthUser }>("/auth/me", { method: "GET" });
      set({ user: response.user, isAuthenticated: true });
    } catch {
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ loading: false });
    }
  },
  signIn: async (identifier, password) => {
    const response = await apiFetch<{ user: AuthUser }>("/auth/login", {
      method: "POST",
      body: { identifier, password },
    });
    set({ user: response.user, isAuthenticated: true });
  },
  signInDemo: async () => {
    const response = await apiFetch<{ user: AuthUser }>("/auth/demo-login", { method: "POST" });
    set({ user: response.user, isAuthenticated: true });
  },
  signUp: async (payload) => {
    const response = await apiFetch<{ user: AuthUser }>("/auth/register", {
      method: "POST",
      body: payload,
    });
    set({ user: response.user, isAuthenticated: true });
  },
  signOut: async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } finally {
      set({ user: null, isAuthenticated: false });
    }
  },
}));
