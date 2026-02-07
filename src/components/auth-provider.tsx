"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { apiClient, apiPaths } from "@/lib/api-client";
import { clearAuthToken, getAuthToken, setAuthToken } from "@/lib/auth";
import { extractItem } from "@/lib/api-utils";
import type { AdminUser } from "@/lib/types";

export type AuthState = {
  user: AdminUser | null;
  loading: boolean;
};

type AuthContextValue = AuthState & {
  refreshUser: () => Promise<void>;
  signIn: (token: string, user?: AdminUser | null) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.get<AdminUser | { data?: AdminUser }>(
        apiPaths.auth.me
      );
      const me = extractItem(response);
      setUser(me ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const signIn = useCallback(
    async (token: string, nextUser?: AdminUser | null) => {
      setAuthToken(token);
      if (nextUser) {
        setUser(nextUser);
        setLoading(false);
        return;
      }
      await refreshUser();
    },
    [refreshUser]
  );

  const signOut = useCallback(() => {
    clearAuthToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, refreshUser, signIn, signOut }),
    [user, loading, refreshUser, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
