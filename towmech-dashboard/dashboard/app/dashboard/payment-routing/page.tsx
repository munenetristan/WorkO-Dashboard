"use client";

import React, { useEffect, useMemo, useState } from "react";

type Country = {
  _id: string;
  code: string;
  name: string;
  currency: string;
  isActive: boolean;
};

type PaymentProviderKey = "PAYSTACK" | "MPESA" | "FLUTTERWAVE" | "PAYFAST" | "IKHOKHA";

type ProviderConfig = {
  enabled: boolean;
  publicKey?: string;
  secretKey?: string;
  webhookSecret?: string;

  // mpesa
  consumerKey?: string;
  consumerSecret?: string;
  passkey?: string;
  shortcode?: string;

  // generic extra
  extra?: Record<string, any>;
};

type PaymentRoutingConfig = {
  _id: string;
  countryCode: string;
  defaultProvider: PaymentProviderKey;
  providers: Record<PaymentProviderKey, ProviderConfig>;
  updatedAt?: string;
  createdAt?: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000";

function authHeaders(extra: Record<string, string> = {}) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

const PROVIDERS: { key: PaymentProviderKey; label: string }[] = [
  { key: "PAYSTACK", label: "Paystack" },
  { key: "MPESA", label: "M-Pesa (Kenya)" },
  { key: "FLUTTERWAVE", label: "Flutterwave" },
  { key: "PAYFAST", label: "PayFast (ZA)" },
  { key: "IKHOKHA", label: "iKhokha (ZA)" },
];

function emptyConfig(countryCode: string): PaymentRoutingConfig {
  return {
    _id: "local",
    countryCode,
    defaultProvider: "PAYSTACK",
    providers: {
      PAYSTACK: { enabled: false, publicKey: "", secretKey: "", webhookSecret: "" },
      MPESA: {
        enabled: false,
        consumerKey: "",
        consumerSecret: "",
        passkey: "",
        shortcode: "",
      },
      FLUTTERWAVE: { enabled: false, publicKey: "", secretKey: "", webhookSecret: "" },
      PAYFAST: { enabled: false, publicKey: "", secretKey: "", webhookSecret: "" },
      IKHOKHA: { enabled: false, publicKey: "", secretKey: "", webhookSecret: "" },
    },
  };
}

export default function PaymentRoutingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>("");

  const [config, setConfig] = useState<PaymentRoutingConfig | null>(null);

  const selectedCountry = useMemo(() => {
    return countries.find((c) => c.code === selectedCountryCode) || null;
  }, [countries, selectedCountryCode]);

  async function loadCountries() {
    const res = await fetch(`${API_BASE}/api/admin/countries`, {
      method: "GET",
      headers: authHeaders(),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.message || "Failed to load countries");
    }

    const data = await res.json();
    const list: Country[] = Array.isArray(data?.countries) ? data.countries : [];
    setCountries(list);

    if (!selectedCountryCode && list.length > 0) {
      setSelectedCountryCode(list[0].code);
    }
  }

  async function loadRouting(countryCode: string) {
    const res = await fetch(`${API_BASE}/api/admin/payment-routing/${countryCode}`, {
      method: "GET",
      headers: authHeaders({ "X-COUNTRY-CODE": countryCode }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data?.message || "Failed to load payment routing config");
    }

    const cfg: PaymentRoutingConfig | null = data?.config || null;
    if (!cfg) {
      setConfig(emptyConfig(countryCode));
      return;
    }

    // normalize providers object
    const merged = emptyConfig(countryCode);
    setConfig({
      ...merged,
      ...cfg,
      providers: {
        ...merged.providers,
        ...(cfg.providers || {}),
      },
    });
  }

  async function init() {
    setLoading(true);
    setError(null);
    try {
      await loadCountries();
    } catch (e: any) {
      setError(e?.message || "Failed to load countries");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedCountryCode) return;

    setLoading(true);
    setError(null);

    loadRouting(selectedCountryCode)
      .catch((e: any) => setError(e?.message || "Failed to load routing"))
      .finally(() => setLoading(false));
  }, [selectedCountryCode]);

  function updateProvider(
    key: PaymentProviderKey,
    patch: Partial<ProviderConfig>
  ) {
    setConfig((prev) => {
      const base = prev || emptyConfig(selectedCountryCode);
      return {
        ...base,
        providers: {
          ...base.providers,
          [key]: {
            ...(base.providers?.[key] || { enabled: false }),
            ...patch,
          },
        },
      };
    });
  }

  async function save() {
    if (!selectedCountryCode || !config) return;

    setSaving(true);
    setError(null);

    try {
      // validate default provider enabled
      const defaultEnabled = config.providers?.[config.defaultProvider]?.enabled;
      if (!defaultEnabled) {
        throw new Error(
          `Default provider (${config.defaultProvider}) must be enabled`
        );
      }

      const payload = {
        countryCode: selectedCountryCode,
        defaultProvider: config.defaultProvider,
        providers: config.providers,
      };

      const res = await fetch(`${API_BASE}/api/admin/payment-routing`, {
        method: "PUT",
        headers: authHeaders({ "X-COUNTRY-CODE": selectedCountryCode }),
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to save config");

      await loadRouting(selectedCountryCode);
    } catch (e: any) {
      setError(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 1200 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
        Payment Routing
      </h1>
      <p style={{ opacity: 0.8, marginBottom: 18 }}>
        Configure payment providers per country (enable/disable + keys). Backend
        will route payments using these settings.
      </p>

      {error ? (
        <div
          style={{
            background: "#ffefef",
            border: "1px solid #ffbdbd",
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
            color: "#7a0000",
          }}
        >
          {error}
        </div>
      ) : null}

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 16,
          background: "white",
          marginBottom: 18,
        }}
      >
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ minWidth: 320 }}>
            <label style={{ fontSize: 12, opacity: 0.8 }}>Country</label>
            <select
              value={selectedCountryCode}
              onChange={(e) => setSelectedCountryCode(e.target.value)}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
            >
              {countries.map((c) => (
                <option key={c._id} value={c.code}>
                  {c.code} — {c.name} {c.isActive ? "" : "(inactive)"}
                </option>
              ))}
            </select>
          </div>

          <div style={{ minWidth: 260 }}>
            <label style={{ fontSize: 12, opacity: 0.8 }}>
              Default provider
            </label>
            <select
              value={config?.defaultProvider || "PAYSTACK"}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...(prev || emptyConfig(selectedCountryCode)),
                  defaultProvider: e.target.value as PaymentProviderKey,
                }))
              }
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
              disabled={loading}
            >
              {PROVIDERS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <button
              onClick={() => selectedCountryCode && loadRouting(selectedCountryCode)}
              disabled={loading || saving}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #d1d5db",
                background: "white",
                cursor: "pointer",
              }}
            >
              Reload
            </button>

            <button
              onClick={save}
              disabled={saving || loading || !selectedCountryCode}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #111827",
                background: saving ? "#9ca3af" : "#111827",
                color: "white",
                cursor: saving ? "not-allowed" : "pointer",
                fontWeight: 800,
              }}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {selectedCountry ? (
          <div style={{ marginTop: 10, fontSize: 13, opacity: 0.75 }}>
            Currency: <b>{selectedCountry.currency}</b>
          </div>
        ) : null}
      </div>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 16,
          background: "white",
        }}
      >
        {loading ? (
          <div style={{ padding: 14, opacity: 0.7 }}>Loading config...</div>
        ) : !config ? (
          <div style={{ padding: 14, opacity: 0.7 }}>No config loaded.</div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {PROVIDERS.map((p) => {
              const cfg = config.providers?.[p.key] || { enabled: false };

              return (
                <div
                  key={p.key}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 14,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      alignItems: "center",
                      flexWrap: "wrap",
                      marginBottom: 10,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 900 }}>{p.label}</div>
                      <div style={{ fontSize: 13, opacity: 0.7 }}>
                        Provider key: <b>{p.key}</b>
                      </div>
                    </div>

                    <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ fontSize: 12, opacity: 0.7 }}>
                        {cfg.enabled ? "ENABLED" : "DISABLED"}
                      </span>
                      <input
                        type="checkbox"
                        checked={!!cfg.enabled}
                        onChange={(e) =>
                          updateProvider(p.key, { enabled: e.target.checked })
                        }
                        style={{ width: 20, height: 20 }}
                      />
                    </label>
                  </div>

                  {/* Fields */}
                  {p.key === "MPESA" ? (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: 12,
                      }}
                    >
                      <Input
                        label="Consumer Key"
                        value={cfg.consumerKey || ""}
                        onChange={(v) => updateProvider("MPESA", { consumerKey: v })}
                      />
                      <Input
                        label="Consumer Secret"
                        value={cfg.consumerSecret || ""}
                        onChange={(v) =>
                          updateProvider("MPESA", { consumerSecret: v })
                        }
                      />
                      <Input
                        label="Passkey"
                        value={cfg.passkey || ""}
                        onChange={(v) => updateProvider("MPESA", { passkey: v })}
                      />
                      <Input
                        label="Shortcode"
                        value={cfg.shortcode || ""}
                        onChange={(v) => updateProvider("MPESA", { shortcode: v })}
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                        gap: 12,
                      }}
                    >
                      <Input
                        label="Public Key"
                        value={cfg.publicKey || ""}
                        onChange={(v) => updateProvider(p.key, { publicKey: v })}
                      />
                      <Input
                        label="Secret Key"
                        value={cfg.secretKey || ""}
                        onChange={(v) => updateProvider(p.key, { secretKey: v })}
                      />
                      <Input
                        label="Webhook Secret"
                        value={cfg.webhookSecret || ""}
                        onChange={(v) =>
                          updateProvider(p.key, { webhookSecret: v })
                        }
                      />
                    </div>
                  )}

                  {config.defaultProvider === p.key ? (
                    <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
                      ⭐ This provider is set as <b>DEFAULT</b> for this country.
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12, opacity: 0.75 }}>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: 10,
          borderRadius: 10,
          border: "1px solid #d1d5db",
          width: "100%",
        }}
      />
    </div>
  );
}