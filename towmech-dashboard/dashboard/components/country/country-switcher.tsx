// components/country/country-switcher.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

type Country = {
  _id?: string;
  code: string;
  name: string;
  currency?: string;
  isActive?: boolean;
};

type Props = {
  value?: string;
  onChange?: (countryCode: string) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000";

const STORAGE_KEY = "countryCode";

function normalizeIso2(v: any) {
  const code = String(v || "")
    .trim()
    .toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : "ZA";
}

function authHeaders(extra: Record<string, string> = {}) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") || localStorage.getItem("adminToken") : null;

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    // ✅ ensure backend sees the active workspace even on direct fetch()
    ...(typeof window !== "undefined"
      ? { "X-COUNTRY-CODE": normalizeIso2(localStorage.getItem(STORAGE_KEY) || "ZA") }
      : {}),
    ...extra,
  };
}

export default function CountrySwitcher({
  value,
  onChange,
  disabled = false,
  label = "Country workspace",
  className,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);

  // ✅ start from localStorage if available (single source of truth)
  const [internalValue, setInternalValue] = useState<string>(() => {
    if (typeof window === "undefined") return normalizeIso2(value || "ZA");
    const stored = localStorage.getItem(STORAGE_KEY);
    return normalizeIso2(value || stored || "ZA");
  });

  const selected = useMemo(() => {
    return countries.find((c) => c.code === internalValue) || null;
  }, [countries, internalValue]);

  function persistCountry(code: string) {
    if (typeof window === "undefined") return;
    const cc = normalizeIso2(code);
    localStorage.setItem(STORAGE_KEY, cc);

    // ✅ remove legacy key if it exists (prevents future mismatch)
    try {
      localStorage.removeItem("towmech_country");
    } catch {
      // ignore
    }

    // ✅ broadcast to other tabs + any listeners
    window.dispatchEvent(new Event("towmech:country-changed"));
  }

  async function loadCountries() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/countries`, {
        method: "GET",
        headers: authHeaders(),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to load countries");

      const list: Country[] = Array.isArray(data?.countries) ? data.countries : [];
      setCountries(list);

      // ✅ if current selection isn't valid, pick first active, persist it
      if (list.length > 0 && !list.some((c) => c.code === internalValue)) {
        const firstActive = list.find((c) => c.isActive !== false) || list[0];
        const cc = normalizeIso2(firstActive.code);
        setInternalValue(cc);
        persistCountry(cc);
        onChange?.(cc);
      }
    } catch {
      // fallback
      const fallback = { code: "ZA", name: "South Africa", currency: "ZAR", isActive: true };
      setCountries([fallback]);
      if (internalValue !== "ZA") {
        setInternalValue("ZA");
        persistCountry("ZA");
        onChange?.("ZA");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCountries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ if parent controls value, keep in sync + persist
  useEffect(() => {
    if (value) {
      const cc = normalizeIso2(value);
      if (cc !== internalValue) {
        setInternalValue(cc);
        persistCountry(cc);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // ✅ sync if localStorage changes (other tab / manual edit)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = () => {
      const stored = normalizeIso2(localStorage.getItem(STORAGE_KEY) || "ZA");
      if (stored !== internalValue) setInternalValue(stored);
    };

    window.addEventListener("storage", handler);
    window.addEventListener("towmech:country-changed", handler);

    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("towmech:country-changed", handler);
    };
  }, [internalValue]);

  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minWidth: 240,
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.75 }}>{label}</div>

      <select
        value={internalValue}
        disabled={disabled || loading}
        onChange={(e) => {
          const code = normalizeIso2(e.target.value);
          setInternalValue(code);
          persistCountry(code);
          onChange?.(code);

          // ✅ hard reload ensures everything refetches using the new workspace
          window.location.reload();
        }}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid #d1d5db",
          background: disabled ? "#f3f4f6" : "white",
          fontWeight: 800,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        {countries.map((c) => (
          <option key={c._id || c.code} value={c.code}>
            {c.code} — {c.name}
            {c.isActive === false ? " (inactive)" : ""}
          </option>
        ))}
      </select>

      {selected ? (
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          Currency: <b>{selected.currency || "-"}</b>
        </div>
      ) : null}
    </div>
  );
}