// lib/api/auth.ts
import api from "@/lib/api/axios";

export type LoginResponse = {
  message?: string;
  requiresOtp?: boolean;
  otp?: string; // only if debug enabled
  token?: string;
  user?: any;
};

function normalizeIso2(v: any) {
  const code = String(v || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

function saveAdminToken(token?: string) {
  if (typeof window === "undefined") return;
  if (!token) return;

  // ✅ use ONE consistent key for dashboard
  localStorage.setItem("adminToken", token);

  // optional compatibility
  localStorage.setItem("token", token);
}

function saveWorkspaceCountryFromUser(user: any) {
  if (typeof window === "undefined") return;
  const iso2 = normalizeIso2(user?.countryCode);
  if (!iso2) return;

  localStorage.setItem("countryCode", iso2);
  window.dispatchEvent(
    new CustomEvent("towmech:country-changed", { detail: { countryCode: iso2 } })
  );
}

/**
 * Builds a safe path that works with either:
 *   baseURL = https://api.towmech.com
 * or
 *   baseURL = https://api.towmech.com/api
 *
 * If baseURL already ends with /api, we don't add it again.
 */
function withApiPrefix(path: string) {
  const base = (api.defaults.baseURL || "").replace(/\/$/, "");
  const alreadyHasApi = base.endsWith("/api") || base.includes("/api/");
  return `${alreadyHasApi ? "" : "/api"}${path.startsWith("/") ? "" : "/"}${path}`;
}

export async function loginWithPhonePassword(payload: {
  phone: string;
  password: string;
}) {
  const url = withApiPrefix("/auth/login");
  const res = await api.post<LoginResponse>(url, payload);

  // If backend ever returns token directly, save it
  saveAdminToken(res.data?.token);

  // If backend returned user with countryCode, save workspace
  if (res.data?.user) saveWorkspaceCountryFromUser(res.data.user);

  return res.data;
}

export async function verifyOtp(payload: { phone: string; otp: string }) {
  const url = withApiPrefix("/auth/verify-otp");
  const res = await api.post<LoginResponse>(url, payload);

  // ✅ OTP verify returns token -> save it
  saveAdminToken(res.data?.token);

  // ✅ save workspace if present
  if (res.data?.user) saveWorkspaceCountryFromUser(res.data.user);

  return res.data;
}

/**
 * ✅ Forgot Password (phone) → sends OTP via SMS
 * POST /api/auth/forgot-password
 */
export async function forgotPassword(payload: { phone: string }) {
  const url = withApiPrefix("/auth/forgot-password");
  const res = await api.post<{ message?: string; requiresOtp?: boolean; otp?: string }>(
    url,
    payload
  );
  return res.data;
}

/**
 * ✅ Reset Password (phone + otp + newPassword)
 * POST /api/auth/reset-password
 */
export async function resetPassword(payload: {
  phone: string;
  otp: string;
  newPassword: string;
}) {
  const url = withApiPrefix("/auth/reset-password");
  const res = await api.post<{ message?: string }>(url, payload);
  return res.data;
}

export function logoutAdmin() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("adminToken");
  localStorage.removeItem("token");
  // do NOT clear countryCode by default (admin workspace preference)
}