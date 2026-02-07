"use client";

import React, { useEffect, useMemo, useState } from "react";
import { computeProviderOwed, fetchPayments } from "@/lib/api/payments";

type Country = {
  _id: string;
  code: string;
  name: string;
  currency: string;
  isActive: boolean;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000";

function authHeaders(extra: Record<string, string> = {}) {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("adminToken") || localStorage.getItem("token")
      : null;

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

function todayYmd() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function PaymentsPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fromDate, setFromDate] = useState<string>(todayYmd());
  const [toDate, setToDate] = useState<string>(todayYmd());
  const [providerId, setProviderId] = useState<string>("");

  const [payments, setPayments] = useState<any[]>([]);
  const [result, setResult] = useState<ReturnType<typeof computeProviderOwed> | null>(null);

  const currency = useMemo(() => {
    const c = countries.find((x) => x.code === selectedCountryCode);
    return c?.currency || "ZAR";
  }, [countries, selectedCountryCode]);

  async function loadCountries() {
    const res = await fetch(`${API_BASE}/api/admin/countries`, {
      method: "GET",
      headers: authHeaders(),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Failed to load countries");

    const list: Country[] = Array.isArray(data?.countries) ? data.countries : [];
    setCountries(list);
    if (!selectedCountryCode && list.length > 0) setSelectedCountryCode(list[0].code);
  }

  useEffect(() => {
    loadCountries().catch((e: any) => setError(e?.message || "Init failed"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run() {
    if (!selectedCountryCode) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const p = await fetchPayments(selectedCountryCode);
      setPayments(p);

      const r = computeProviderOwed({
        payments: p,
        providerId: providerId.trim() || undefined,
        fromYmd: fromDate,
        toYmd: toDate,
      });

      setResult(r);
    } catch (e: any) {
      setError(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 1400 }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>Provider Owed Summary</h1>
      <p style={{ opacity: 0.8, marginBottom: 18 }}>
        Filter by date range and optionally by Provider/Driver ID to see how much is due.
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
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "end",
        }}
      >
        <div style={{ minWidth: 320 }}>
          <label style={{ fontSize: 12, opacity: 0.75 }}>Country</label>
          <select
            value={selectedCountryCode}
            onChange={(e) => setSelectedCountryCode(e.target.value)}
            style={inputStyle}
          >
            {countries.map((c) => (
              <option key={c._id} value={c.code}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: 220 }}>
          <label style={{ fontSize: 12, opacity: 0.75 }}>From</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ minWidth: 220 }}>
          <label style={{ fontSize: 12, opacity: 0.75 }}>To</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ minWidth: 360 }}>
          <label style={{ fontSize: 12, opacity: 0.75 }}>Provider/Driver ID (optional)</label>
          <input
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
            placeholder="paste providerId"
            style={inputStyle}
          />
        </div>

        <div style={{ marginLeft: "auto" }}>
          <button onClick={run} disabled={loading || !selectedCountryCode} style={primaryBtn}>
            {loading ? "Loading..." : "Compute"}
          </button>
        </div>
      </div>

      {!result ? (
        <div style={{ opacity: 0.75 }}>Run compute to see results.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "520px 1fr", gap: 16 }}>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, background: "white", overflow: "hidden" }}>
            <div style={{ padding: 14, borderBottom: "1px solid #e5e7eb", fontWeight: 900 }}>
              Providers ({result.providers.length})
            </div>

            <div style={{ padding: 14, fontSize: 13 }}>
              <b>Total due (all providers):</b> {result.totalDueAll} {currency}
            </div>

            <div style={{ maxHeight: 520, overflow: "auto" }}>
              {result.providers.map((p) => (
                <div key={p.providerId} style={{ padding: 12, borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ fontWeight: 900, fontSize: 13 }}>
                    {p.providerName || "Unknown Provider"}{" "}
                    <span style={{ opacity: 0.6, fontWeight: 700 }}>• {p.providerId}</span>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                    Jobs: <b>{p.jobCount}</b> • Total due: <b>{p.totalDue}</b> {currency}
                  </div>
                </div>
              ))}
              {result.providers.length === 0 ? (
                <div style={{ padding: 14, opacity: 0.75 }}>No providers found for this filter.</div>
              ) : null}
            </div>
          </div>

          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, background: "white", overflow: "hidden" }}>
            <div style={{ padding: 14, borderBottom: "1px solid #e5e7eb", fontWeight: 900 }}>
              Jobs ({result.rows.length})
            </div>

            <div style={{ maxHeight: 640, overflow: "auto" }}>
              {result.rows.map((r) => (
                <div key={r.jobId} style={{ padding: 12, borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 900, fontSize: 13 }}>Job {r.jobId.slice(-8).toUpperCase()}</div>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>{new Date(r.createdAt).toLocaleString()}</div>
                  </div>

                  <div style={{ fontSize: 12, marginTop: 6 }}>
                    <b>Provider:</b> {r.providerName || "-"}{" "}
                    {r.providerId ? <span style={{ opacity: 0.7 }}>• {r.providerId}</span> : null}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 6 }}>
                    <b>Pickup:</b> {r.pickup || "-"}
                  </div>
                  <div style={{ fontSize: 12 }}>
                    <b>Dropoff:</b> {r.dropoff || "-"}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 6 }}>
                    <b>Provider due:</b> {r.providerAmountDue} {currency}
                  </div>
                </div>
              ))}

              {result.rows.length === 0 ? (
                <div style={{ padding: 14, opacity: 0.75 }}>No jobs found for this filter.</div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 10,
  borderRadius: 10,
  border: "1px solid #d1d5db",
};

const primaryBtn: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #111827",
  background: "#111827",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
};