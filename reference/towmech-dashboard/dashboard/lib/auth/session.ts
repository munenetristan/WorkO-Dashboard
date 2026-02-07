// lib/auth/session.ts
"use client";

import api from "@/lib/api/axios";

export type AdminPermissions = Record<string, boolean>;

export type AdminUser = {
  _id?: string;
  id?: string;
  role?: string;
  countryCode?: string;
  permissions?: AdminPermissions | null;
  email?: string;
  name?: string;
};

const TOKEN_KEY = "adminToken";
const FALLBACK_TOKEN_KEY = "token";
const USER_CACHE_KEY = "towmech_admin_user";

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(FALLBACK_TOKEN_KEY);
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(FALLBACK_TOKEN_KEY);
  localStorage.removeItem(USER_CACHE_KEY);
}

export function getCachedUser(): AdminUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    return raw ? (JSON.parse(raw) as AdminUser) : null;
  } catch {
    return null;
  }
}

export function cacheUser(user: AdminUser) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user || {}));
}

export async function fetchMe(): Promise<AdminUser | null> {
  try {
    const res = await api.get<{ user?: AdminUser }>("/auth/me");
    const user = res.data?.user || null;
    if (user) cacheUser(user);
    return user;
  } catch {
    return null;
  }
}

export function hasPermission(user: AdminUser | null, key: string) {
  if (!user) return false;

  // SuperAdmin sees everything
  if (user.role === "SuperAdmin") return true;

  // Permissions might be null for some admins created earlier
  const perms = user.permissions || {};
  return !!(perms as any)[key];
}