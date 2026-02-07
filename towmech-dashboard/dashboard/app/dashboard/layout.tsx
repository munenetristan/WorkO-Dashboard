// app/dashboard/layout.tsx
"use client";

import React, { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import DashboardShell from "@/components/layout/dashboard-shell";
import CountrySwitcher from "@/components/country/country-switcher";

const STORAGE_KEY = "countryCode";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [countryCode, setCountryCode] = useState<string>("ZA");

  // ✅ Hydrate from localStorage on first load
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && /^[A-Z]{2}$/.test(saved)) setCountryCode(saved);
  }, []);

  // ✅ Persist and broadcast changes (so API layer / other tabs can react)
  const handleChange = (code: string) => {
    const normalized = String(code || "")
      .trim()
      .toUpperCase();

    if (!/^[A-Z]{2}$/.test(normalized)) return;

    setCountryCode(normalized);

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, normalized);
      window.dispatchEvent(
        new CustomEvent("towmech:country-changed", { detail: { countryCode: normalized } })
      );
    }
  };

  return (
    <AuthGuard>
      <DashboardShell
        headerRight={
          <CountrySwitcher value={countryCode} onChange={handleChange} />
        }
      >
        {children}
      </DashboardShell>
    </AuthGuard>
  );
}