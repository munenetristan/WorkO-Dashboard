"use client";

import { AuthProvider } from "@/components/auth-provider";
import { ToastProvider } from "@/components/toast";

export const AppProviders = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>
    <AuthProvider>{children}</AuthProvider>
  </ToastProvider>
);
