// components/auth/auth-guard.tsx
"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { fetchMe, getToken, cacheUser } from "@/lib/auth/session";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    const isLoginPage = pathname === "/login";

    // no token -> go login
    if (!token && !isLoginPage) {
      router.replace("/login");
      setReady(true);
      return;
    }

    // token exists -> load user (permissions/countryCode)
    (async () => {
      if (token) {
        const me = await fetchMe();
        if (!me && !isLoginPage) {
          // token invalid
          localStorage.removeItem("adminToken");
          localStorage.removeItem("token");
          router.replace("/login");
          setReady(true);
          return;
        }

        // ensure cache exists even if backend returns partial
        cacheUser(me || {});
      }

      // if already logged in and on login page
      if (token && isLoginPage) router.replace("/dashboard");
      setReady(true);
    })();
  }, [router, pathname]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        Checking session...
      </div>
    );
  }

  return <>{children}</>;
}