"use client";

import React, { useEffect, useMemo, useState } from "react";

type Country = {
  _id: string;
  code: string;
  name: string;
  currency: string;
  isActive: boolean;
};

/**
 * UI keys (what the dashboard uses in this page)
 */
type UiServices = {
  towing: boolean;
  mechanic: boolean;
  emergency: boolean;

  // future toggles
  insurance: boolean;
  chat: boolean;
  ratings: boolean;

  // extra (optional — if you later decide to show them)
  winchRecovery?: boolean;
  roadsideAssistance?: boolean;
  jumpStart?: boolean;
  tyreChange?: boolean;
  fuelDelivery?: boolean;
  lockout?: boolean;
};

/**
 * What backend ACTUALLY stores/returns (canonical)
 * from adminCountryServices.routes.js
 */
type ApiServices = {
  towingEnabled?: boolean;
  mechanicEnabled?: boolean;
  emergencySupportEnabled?: boolean; // canonical
  supportEnabled?: boolean; // legacy alias maintained by backend

  insuranceEnabled?: boolean;
  chatEnabled?: boolean;
  ratingsEnabled?: boolean;

  winchRecoveryEnabled?: boolean;
  roadsideAssistanceEnabled?: boolean;
  jumpStartEnabled?: boolean;
  tyreChangeEnabled?: boolean;
  fuelDeliveryEnabled?: boolean;
  lockoutEnabled?: boolean;

  // allow unknown keys without breaking
  [key: string]: any;
};

type ServiceConfig = {
  _id: string;
  countryCode: string;

  /**
   * IMPORTANT:
   * backend response returns "services" object with "*Enabled" keys.
   * we keep it as "any" here and normalize into UiServices.
   */
  services: any;

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

/**
 * UI defaults (what you want to show if backend missing keys)
 */
const DEFAULT_UI_SERVICES: UiServices = {
  towing: true,
  mechanic: true,
  emergency: true,
  insurance: false,
  chat: true,
  ratings: true,
};

/**
 * ✅ Convert backend services (towingEnabled etc) -> UI services (towing etc)
 * SAFE: supports both formats in case old data exists.
 */
function apiToUiServices(input: any): UiServices {
  const s: ApiServices = input && typeof input === "object" ? input : {};

  // emergency can arrive as emergencySupportEnabled OR supportEnabled OR emergency/emergencySupport
  const emergency =
    typeof s.emergencySupportEnabled === "boolean"
      ? s.emergencySupportEnabled
      : typeof s.supportEnabled === "boolean"
        ? s.supportEnabled
        : typeof (s as any).emergencySupport === "boolean"
          ? (s as any).emergencySupport
          : typeof (s as any).support === "boolean"
            ? (s as any).support
            : typeof (s as any).emergency === "boolean"
              ? (s as any).emergency
              : DEFAULT_UI_SERVICES.emergency;

  return {
    towing:
      typeof s.towingEnabled === "boolean"
        ? s.towingEnabled
        : typeof (s as any).towing === "boolean"
          ? (s as any).towing
          : DEFAULT_UI_SERVICES.towing,

    mechanic:
      typeof s.mechanicEnabled === "boolean"
        ? s.mechanicEnabled
        : typeof (s as any).mechanic === "boolean"
          ? (s as any).mechanic
          : DEFAULT_UI_SERVICES.mechanic,

    emergency,

    insurance:
      typeof s.insuranceEnabled === "boolean"
        ? s.insuranceEnabled
        : typeof (s as any).insurance === "boolean"
          ? (s as any).insurance
          : DEFAULT_UI_SERVICES.insurance,

    chat:
      typeof s.chatEnabled === "boolean"
        ? s.chatEnabled
        : typeof (s as any).chat === "boolean"
          ? (s as any).chat
          : DEFAULT_UI_SERVICES.chat,

    ratings:
      typeof s.ratingsEnabled === "boolean"
        ? s.ratingsEnabled
        : typeof (s as any).ratings === "boolean"
          ? (s as any).ratings
          : DEFAULT_UI_SERVICES.ratings,

    // optional extras (if backend returns them)
    winchRecovery:
      typeof s.winchRecoveryEnabled === "boolean" ? s.winchRecoveryEnabled : undefined,
    roadsideAssistance:
      typeof s.roadsideAssistanceEnabled === "boolean" ? s.roadsideAssistanceEnabled : undefined,
    jumpStart:
      typeof s.jumpStartEnabled === "boolean" ? s.jumpStartEnabled : undefined,
    tyreChange:
      typeof s.tyreChangeEnabled === "boolean" ? s.tyreChangeEnabled : undefined,
    fuelDelivery:
      typeof s.fuelDeliveryEnabled === "boolean" ? s.fuelDeliveryEnabled : undefined,
    lockout:
      typeof s.lockoutEnabled === "boolean" ? s.lockoutEnabled : undefined,
  };
}

/**
 * ✅ Convert UI services (towing etc) -> backend patch (towingEnabled etc)
 * This is the KEY fix: save the keys backend actually persists.
 */
function uiToApiServices(ui: UiServices): ApiServices {
  return {
    towingEnabled: !!ui.towing,
    mechanicEnabled: !!ui.mechanic,
    emergencySupportEnabled: !!ui.emergency,
    // keep alias in sync (backend also does this, but safe to send both)
    supportEnabled: !!ui.emergency,

    insuranceEnabled: !!ui.insurance,
    chatEnabled: !!ui.chat,
    ratingsEnabled: !!ui.ratings,

    // optional extras (only if present)
    ...(typeof ui.winchRecovery === "boolean"
      ? { winchRecoveryEnabled: ui.winchRecovery }
      : {}),
    ...(typeof ui.roadsideAssistance === "boolean"
      ? { roadsideAssistanceEnabled: ui.roadsideAssistance }
      : {}),
    ...(typeof ui.jumpStart === "boolean" ? { jumpStartEnabled: ui.jumpStart } : {}),
    ...(typeof ui.tyreChange === "boolean" ? { tyreChangeEnabled: ui.tyreChange } : {}),
    ...(typeof ui.fuelDelivery === "boolean"
      ? { fuelDeliveryEnabled: ui.fuelDelivery }
      : {}),
    ...(typeof ui.lockout === "boolean" ? { lockoutEnabled: ui.lockout } : {}),
  };
}

export default function CountryServicesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>("");

  const [config, setConfig] = useState<ServiceConfig | null>(null);

  // UI services state (source of truth for toggles on this page)
  const [uiServices, setUiServices] = useState<UiServices>({ ...DEFAULT_UI_SERVICES });

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

  async function loadCountryServiceConfig(countryCode: string) {
    const res = await fetch(`${API_BASE}/api/admin/country-services/${countryCode}`, {
      method: "GET",
      headers: authHeaders({ "X-COUNTRY-CODE": countryCode }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data?.message || "Failed to load service config");
    }

    const cfg: ServiceConfig | null = data?.config || null;

    if (!cfg) {
      // no config yet -> UI uses defaults
      setConfig({
        _id: "local",
        countryCode,
        services: {},
      });
      setUiServices({ ...DEFAULT_UI_SERVICES });
      return;
    }

    // Store raw config (for metadata) but normalize services for UI
    setConfig(cfg);
    const normalizedUi = apiToUiServices(cfg.services);
    setUiServices({
      ...DEFAULT_UI_SERVICES,
      ...normalizedUi,
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

  async function save() {
    if (!selectedCountryCode) return;

    setSaving(true);
    setError(null);

    try {
      // ✅ IMPORTANT: send backend keys, not UI keys
      const payload = {
        countryCode: selectedCountryCode,
        services: uiToApiServices(uiServices),
      };

      const res = await fetch(`${API_BASE}/api/admin/country-services`, {
        method: "PUT",
        headers: authHeaders({ "X-COUNTRY-CODE": selectedCountryCode }),
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to save");

      // ✅ reload so UI reflects stored config
      await loadCountryServiceConfig(selectedCountryCode);
    } catch (e: any) {
      setError(e?.message || "Failed to save");
    } finally {
      setSaving(false);
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

    loadCountryServiceConfig(selectedCountryCode)
      .catch((e: any) => setError(e?.message || "Failed to load config"))
      .finally(() => setLoading(false));
  }, [selectedCountryCode]);

  function setService(key: keyof UiServices, value: boolean) {
    setUiServices((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  const services = uiServices;

  return (
    <div style={{ padding: 20, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        Country Services
      </h1>
      <p style={{ marginBottom: 18, opacity: 0.8 }}>
        Enable / disable services per country (feature flags).
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
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 280 }}>
            <label style={{ fontSize: 12, opacity: 0.8 }}>Country</label>
            <select
              value={selectedCountryCode}
              onChange={(e) => setSelectedCountryCode(e.target.value)}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #d1d5db",
                background: "white",
              }}
            >
              {countries.map((c) => (
                <option key={c._id} value={c.code}>
                  {c.code} — {c.name} {c.isActive ? "" : "(inactive)"}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <button
              onClick={() =>
                selectedCountryCode && loadCountryServiceConfig(selectedCountryCode)
              }
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
                fontWeight: 700,
              }}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
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
          <div style={{ padding: 16, opacity: 0.7 }}>Loading config...</div>
        ) : !selectedCountry ? (
          <div style={{ padding: 16, opacity: 0.7 }}>
            No country selected.
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
              Services for {selectedCountry.code} — {selectedCountry.name}
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <ToggleRow
                title="Towing"
                description="Enable towing jobs + tow truck provider flows"
                value={services.towing}
                onChange={(v) => setService("towing", v)}
              />

              <ToggleRow
                title="Mechanic"
                description="Enable mechanic jobs + mechanic provider flows"
                value={services.mechanic}
                onChange={(v) => setService("mechanic", v)}
              />

              <ToggleRow
                title="Emergency Support"
                description="Emergency roadside support service"
                value={services.emergency}
                onChange={(v) => setService("emergency", v)}
              />

              <ToggleRow
                title="Insurance"
                description="Enable insurance partner booking flow (codes + invoicing)"
                value={services.insurance}
                onChange={(v) => setService("insurance", v)}
              />

              <ToggleRow
                title="Chat"
                description="Enable in-app chat (customer ↔ provider)"
                value={services.chat}
                onChange={(v) => setService("chat", v)}
              />

              <ToggleRow
                title="Ratings"
                description="Enable ratings system after job completion"
                value={services.ratings}
                onChange={(v) => setService("ratings", v)}
              />
            </div>

            <div style={{ marginTop: 18, opacity: 0.75, fontSize: 13 }}>
              <b>Note:</b> Services are feature flags only. Backend must still
              enforce restrictions (e.g. block towing requests if towing is off).
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 14,
        display: "flex",
        gap: 12,
        alignItems: "center",
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800 }}>{title}</div>
        <div style={{ fontSize: 13, opacity: 0.75 }}>{description}</div>
      </div>

      <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <span style={{ fontSize: 12, opacity: 0.7 }}>
          {value ? "ON" : "OFF"}
        </span>
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          style={{ width: 20, height: 20 }}
        />
      </label>
    </div>
  );
}