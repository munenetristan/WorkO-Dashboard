// lib/api/client.ts
import axios from "axios";

/**
 * ✅ Keep this file for backward compatibility
 * Some older dashboard code may import { api } from "@/lib/api/client".
 *
 * ✅ Alignment goals:
 * - Use the SAME baseURL behavior as lib/api/axios.ts (always ends with /api)
 * - Use the SAME auth header source (adminToken OR token)
 * - Use the SAME workspace key ("countryCode")
 * - Always send X-COUNTRY-CODE
 * - Avoid double /api/api issues
 */

const RAW_API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000";

function buildApiBaseUrl(input: string) {
  const trimmed = String(input || "").trim().replace(/\/+$/, "");
  if (trimmed.toLowerCase().endsWith("/api")) return trimmed;
  return `${trimmed}/api`;
}

const API_BASE = buildApiBaseUrl(RAW_API_BASE);

function normalizeIso2(v: any) {
  const code = String(v || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : "ZA";
}

function getCountryCode(): string {
  if (typeof window === "undefined") return "ZA";

  // ✅ primary canonical key
  const direct = localStorage.getItem("countryCode");
  if (direct) return normalizeIso2(direct);

  // ✅ fallback: older code sometimes used a different key name
  const legacy = localStorage.getItem("COUNTRY_CODE");
  if (legacy) return normalizeIso2(legacy);

  // ✅ fallback: Zustand persist store
  try {
    const raw = localStorage.getItem("towmech_country_store");
    if (raw) {
      const parsed = JSON.parse(raw);
      const cc = parsed?.state?.countryCode;
      if (cc) return normalizeIso2(cc);
    }
  } catch {}

  return "ZA";
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("adminToken") || localStorage.getItem("token");
}

export const api = axios.create({
  baseURL: API_BASE,
  // Keep your original setting, but note: withCredentials only matters if backend uses cookies.
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  // ✅ prevent double "/api/api" if someone passes "/api/..." as url
  if (config.url && typeof config.url === "string") {
    if (API_BASE.toLowerCase().endsWith("/api") && config.url.startsWith("/api/")) {
      config.url = config.url.replace(/^\/api/, "");
    }
  }

  config.headers = config.headers || {};

  // ✅ auth header aligned with main client
  const token = getToken();
  if (token) {
    (config.headers as any).Authorization = `Bearer ${token}`;
  }

  // ✅ workspace header aligned with main client
  (config.headers as any)["X-COUNTRY-CODE"] = getCountryCode();

  return config;
});

// Optional default export for convenience
export default api;