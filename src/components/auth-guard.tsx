"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { getAuthToken } from "@/lib/auth";

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const token = getAuthToken();

  useEffect(() => {
    if (!loading && !user && !token) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, user, token, router, pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-500">
          Loading admin session...
        </div>
      </div>
    );
  }

  if (!user && !token) {
    return null;
  }

  return <>{children}</>;
};
