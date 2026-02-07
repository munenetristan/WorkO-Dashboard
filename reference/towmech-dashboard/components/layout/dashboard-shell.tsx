"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { LogOut } from "lucide-react";

import api from "@/lib/api/axios";
import { logoutAdmin } from "@/lib/api/auth";

import { ADMIN_NAV_ITEMS, type AdminNavItem } from "@/config/admin-nav";

type Props = {
  children: React.ReactNode;
  headerRight?: React.ReactNode; // CountrySwitcher passed from layout
};

type Permissions = Record<string, boolean>;

type MeResponse = {
  user?: {
    _id?: string;
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    countryCode?: string;
    permissions?: Permissions | null;
  };
};

function isAdminRole(role?: string) {
  return role === "Admin" || role === "SuperAdmin";
}

function normalizeIso2(v: any) {
  const code = String(v || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : "ZA";
}

function hasPermission(perms: Permissions, key?: string | string[]) {
  if (!key) return true;

  // string[] means: ANY of these permissions can unlock the nav item
  if (Array.isArray(key)) {
    return key.some((k) => perms?.[k] === true);
  }

  // string means: that permission must be true
  return perms?.[key] === true;
}

export default function DashboardShell({ children, headerRight }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const [meLoading, setMeLoading] = useState(true);
  const [me, setMe] = useState<MeResponse["user"] | null>(null);
  const [meError, setMeError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadMe() {
      setMeLoading(true);
      setMeError(null);
      try {
        const res = await api.get("/auth/me");
        const data: MeResponse = res?.data || {};
        if (!mounted) return;

        const u = data?.user || null;
        setMe(u);

        // cache for other components
        try {
          if (typeof window !== "undefined") {
            localStorage.setItem("towmech_admin_me", JSON.stringify(u || {}));
          }
        } catch {}

        // ✅ IMPORTANT: lock workspace for Admins who cannot switch
        // Even if user previously selected another country, force it back.
        try {
          if (typeof window !== "undefined" && u?.role === "Admin") {
            const perms = (u?.permissions || {}) as Permissions;
            const canSwitch = perms?.canSwitchCountryWorkspace === true;

            if (!canSwitch) {
              const cc = normalizeIso2(u?.countryCode);
              localStorage.setItem("countryCode", cc);
              window.dispatchEvent(
                new CustomEvent("towmech:country-changed", { detail: { countryCode: cc } })
              );
            }
          }
        } catch {}
      } catch (err: any) {
        if (!mounted) return;
        setMe(null);
        setMeError(err?.response?.data?.message || "Failed to load session");
      } finally {
        if (!mounted) return;
        setMeLoading(false);
      }
    }

    loadMe();
    return () => {
      mounted = false;
    };
  }, []);

  const role = me?.role;
  const perms: Permissions = (me?.permissions as Permissions) || {};

  // ✅ Permission filter:
  // - SuperAdmin sees everything
  // - Admin sees items only if permissionKey is true OR item has no permissionKey
  // - permissionKey can be string OR string[] (ANY)
  const visibleNavItems = useMemo<AdminNavItem[]>(() => {
    if (!isAdminRole(role)) return [];
    if (role === "SuperAdmin") return ADMIN_NAV_ITEMS;

    return ADMIN_NAV_ITEMS.filter((item) => hasPermission(perms, item.permissionKey));
  }, [role, perms]);

  const canSwitchCountryWorkspace =
    role === "SuperAdmin" || perms?.canSwitchCountryWorkspace === true;

  // ✅ if they can’t switch workspace: show nothing on the top right
  const safeHeaderRight = canSwitchCountryWorkspace ? headerRight : null;

  const handleLogout = () => {
    logoutAdmin();
    try {
      localStorage.removeItem("towmech_admin_me");
    } catch {}
    router.replace("/login");
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-64 border-r bg-white px-4 py-6">
        <div className="mb-6">
          <h1 className="text-lg font-semibold">TowMech Admin</h1>
          <p className="text-sm text-gray-500">Dashboard</p>

          <div className="mt-3 text-xs text-gray-500">
            {meLoading ? (
              <div>Loading session...</div>
            ) : me ? (
              <div>
                <div className="font-semibold text-gray-700">{me?.name || "Admin"}</div>
                <div className="opacity-80">{me?.email || ""}</div>
                <div className="opacity-80">
                  Role: <span className="font-semibold">{me?.role || "-"}</span>
                </div>
              </div>
            ) : (
              <div className="text-red-600">{meError || "Not logged in"}</div>
            )}
          </div>
        </div>

        <nav className="space-y-1">
          {visibleNavItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname?.startsWith(item.href);

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                  isActive ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 border-t pt-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            type="button"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1">
        <div className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="text-sm text-gray-500">Dashboard</div>
            <div className="flex items-center gap-3">{safeHeaderRight}</div>
          </div>
        </div>

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}