"use client";

import * as React from "react";
import { AuthUser, useAuthStore } from "@/store/useAuthStore";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<void>;
  signInDemo: () => Promise<void>;
  signUp: (payload: { name: string; email: string; password: string; role?: "STUDENT" | "ORGANIZER" }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const signIn = useAuthStore((state) => state.signIn);
  const signInDemo = useAuthStore((state) => state.signInDemo);
  const signUp = useAuthStore((state) => state.signUp);
  const signOut = useAuthStore((state) => state.signOut);

  React.useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const value = React.useMemo<AuthContextValue>(
    () => ({ user, loading, signIn, signInDemo, signUp, signOut, refreshSession }),
    [user, loading, signIn, signInDemo, signUp, signOut, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
