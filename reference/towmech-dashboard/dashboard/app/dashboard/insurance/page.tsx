// dashboard/app/dashboard/insurance/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  createPartner,
  disableCode,
  downloadInvoicePdf,
  downloadProviderStatementPdf,
  downloadProvidersSummaryPdf,
  generateCodes,
  getCodes,
  getInvoice,
  getPartners,
  updatePartner,
  type InsuranceCode,
  type InsurancePartner,
  type InvoiceResponse,
} from "@/lib/api/insurance";

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

const MONTHS = (() => {
  const now = new Date();
  const list: string[] = [];
  for (let i = 0; i < 18; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    list.push(`${d.getFullYear()}-${mm}`);
  }
  return list;
})();

function todayYmd() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function InsurancePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>("");

  const [partners, setPartners] = useState<InsurancePartner[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");

  const selectedPartner = useMemo(
    () => partners.find((p) => p._id === selectedPartnerId) || null,
    [partners, selectedPartnerId]
  );

  const [codes, setCodes] = useState<InsuranceCode[]>([]);
  const [codeStatusFilter, setCodeStatusFilter] = useState<
    "ALL" | "ACTIVE" | "USED" | "EXPIRED" | "REVOKED"
  >("ALL");

  // Create partner
  const [newPartnerName, setNewPartnerName] = useState("");
  const [newPartnerCode, setNewPartnerCode] = useState("");
  const [newPartnerEmail, setNewPartnerEmail] = useState("");
  const [newPartnerPhone, setNewPartnerPhone] = useState("");

  // Generate codes
  const [generateCount, setGenerateCount] = useState<number>(50);

  // Invoice filters
  const [invoiceMode, setInvoiceMode] = useState<"MONTH" | "RANGE">("MONTH");
  const [invoiceMonth, setInvoiceMonth] = useState<string>(MONTHS[0]);

  const [fromDate, setFromDate] = useState<string>(todayYmd());
  const [toDate, setToDate] = useState<string>(todayYmd());

  // used for individual provider statement PDF
  const [providerIdFilter, setProviderIdFilter] = useState<string>("");

  const [invoice, setInvoice] = useState<InvoiceResponse | null>(null);

  async function loadCountries() {
    const res = await fetch(`${API_BASE}/api/admin/countries`, {
      method: "GET",
      headers: authHeaders(),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Failed to load countries");

    const list: Country[] = Array.isArray(data?.countries) ? data.countries : [];
    setCountries(list);

    if (!selectedCountryCode && list.length > 0) {
      setSelectedCountryCode(list[0].code);
    }
  }

  async function init() {
    setLoading(true);
    setError(null);
    try {
      await loadCountries();
    } catch (e: any) {
      setError(e?.message || "Failed to init");
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

    getPartners(selectedCountryCode)
      .then((list) => {
        setPartners(list);
        if (!selectedPartnerId && list.length > 0) setSelectedPartnerId(list[0]._id);
        if (selectedPartnerId && !list.some((p) => p._id === selectedPartnerId)) {
          setSelectedPartnerId(list[0]?._id || "");
        }
      })
      .catch((e: any) => setError(e?.message || "Failed to load partners"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountryCode]);

  useEffect(() => {
    if (!selectedCountryCode || !selectedPartnerId) return;
    setLoading(true);
    setError(null);

    getCodes(selectedCountryCode, selectedPartnerId)
      .then((list) => setCodes(list))
      .catch((e: any) => setError(e?.message || "Failed to load codes"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPartnerId, selectedCountryCode]);

  function normalizeCodeStatus(c: InsuranceCode): "ACTIVE" | "USED" | "EXPIRED" | "REVOKED" {
    const usedCount = c.usage?.usedCount || 0;
    if (usedCount > 0) return "USED";

    if (c.expiresAt) {
      const exp = new Date(c.expiresAt).getTime();
      if (Number.isFinite(exp) && Date.now() > exp) return "EXPIRED";
    }

    if (c.isActive === false) return "REVOKED";
    return "ACTIVE";
  }

  const filteredCodes = useMemo(() => {
    if (codeStatusFilter === "ALL") return codes;
    return codes.filter((c) => normalizeCodeStatus(c) === codeStatusFilter);
  }, [codes, codeStatusFilter]);

  async function onCreatePartner() {
    if (!selectedCountryCode) return;

    const name = newPartnerName.trim();
    const partnerCode = newPartnerCode.trim().toUpperCase();

    if (!name) return setError("Partner name is required");
    if (!partnerCode) return setError("Partner code is required");

    setSaving(true);
    setError(null);

    try {
      await createPartner(selectedCountryCode, {
        name,
        partnerCode,
        email: newPartnerEmail.trim() || null,
        phone: newPartnerPhone.trim() || null,
        countryCodes: [selectedCountryCode],
      });

      setNewPartnerName("");
      setNewPartnerCode("");
      setNewPartnerEmail("");
      setNewPartnerPhone("");

      const list = await getPartners(selectedCountryCode);
      setPartners(list);
      if (list.length > 0) setSelectedPartnerId(list[0]._id);
    } catch (e: any) {
      setError(e?.message || "Create partner failed");
    } finally {
      setSaving(false);
    }
  }

  async function togglePartnerActive(partnerId: string, nextActive: boolean) {
    if (!selectedCountryCode) return;
    setSaving(true);
    setError(null);
    try {
      await updatePartner(selectedCountryCode, partnerId, { isActive: nextActive });
      const list = await getPartners(selectedCountryCode);
      setPartners(list);
    } catch (e: any) {
      setError(e?.message || "Update partner failed");
    } finally {
      setSaving(false);
    }
  }

  async function onGenerateCodes() {
    if (!selectedCountryCode || !selectedPartnerId) return;

    const count = Number(generateCount || 0);
    if (!count || count < 1 || count > 5000) return setError("Enter a valid number (1 - 5000)");

    setSaving(true);
    setError(null);

    try {
      await generateCodes(selectedCountryCode, {
        partnerId: selectedPartnerId,
        countryCode: selectedCountryCode,
        count,
      });

      const list = await getCodes(selectedCountryCode, selectedPartnerId);
      setCodes(list);
    } catch (e: any) {
      setError(e?.message || "Generate codes failed");
    } finally {
      setSaving(false);
    }
  }

  async function onDisableCode(codeId: string) {
    if (!selectedCountryCode) return;
    setSaving(true);
    setError(null);
    try {
      await disableCode(selectedCountryCode, codeId);
      const list = await getCodes(selectedCountryCode, selectedPartnerId);
      setCodes(list);
    } catch (e: any) {
      setError(e?.message || "Disable failed");
    } finally {
      setSaving(false);
    }
  }

  async function onLoadInvoice() {
    if (!selectedCountryCode || !selectedPartnerId) return;

    setSaving(true);
    setError(null);
    setInvoice(null);

    try {
      const inv = await getInvoice({
        countryCode: selectedCountryCode,
        partnerId: selectedPartnerId,
        month: invoiceMode === "MONTH" ? invoiceMonth : undefined,
        from: invoiceMode === "RANGE" ? fromDate : undefined,
        to: invoiceMode === "RANGE" ? toDate : undefined,
        providerId: providerIdFilter.trim() || undefined,
      });

      setInvoice(inv);
    } catch (e: any) {
      setError(e?.message || "Invoice fetch failed");
    } finally {
      setSaving(false);
    }
  }

  function commonPdfArgs() {
    return {
      countryCode: selectedCountryCode,
      partnerId: selectedPartnerId,
      month: invoiceMode === "MONTH" ? invoiceMonth : undefined,
      from: invoiceMode === "RANGE" ? fromDate : undefined,
      to: invoiceMode === "RANGE" ? toDate : undefined,
    };
  }

  async function onDownloadPartnerInvoicePdf() {
    if (!selectedCountryCode || !selectedPartnerId) return;
    setSaving(true);
    setError(null);

    try {
      const blob = await downloadInvoicePdf({
        ...commonPdfArgs(),
        providerId: providerIdFilter.trim() || undefined,
      });

      const label =
        invoiceMode === "MONTH"
          ? `partner-invoice-${selectedCountryCode}-${invoiceMonth}.pdf`
          : `partner-invoice-${selectedCountryCode}-${fromDate}-to-${toDate}.pdf`;

      saveBlob(blob, label);
    } catch (e: any) {
      setError(e?.message || "PDF download failed");
    } finally {
      setSaving(false);
    }
  }

  // ✅ General statement (all providers owed summary)
  async function onDownloadProvidersSummaryPdf() {
    if (!selectedCountryCode || !selectedPartnerId) return;
    setSaving(true);
    setError(null);

    try {
      const blob = await downloadProvidersSummaryPdf(commonPdfArgs());

      const label =
        invoiceMode === "MONTH"
          ? `providers-summary-${selectedCountryCode}-${invoiceMonth}.pdf`
          : `providers-summary-${selectedCountryCode}-${fromDate}-to-${toDate}.pdf`;

      saveBlob(blob, label);
    } catch (e: any) {
      setError(e?.message || "Providers summary PDF failed");
    } finally {
      setSaving(false);
    }
  }

  // ✅ Individual provider statement (requires providerId)
  async function onDownloadProviderStatementPdf() {
    if (!selectedCountryCode || !selectedPartnerId) return;
    const pid = providerIdFilter.trim();
    if (!pid) return setError("Paste a Provider/Driver ID to download an individual statement.");

    setSaving(true);
    setError(null);

    try {
      const blob = await downloadProviderStatementPdf({
        ...commonPdfArgs(),
        providerId: pid,
      });

      const label =
        invoiceMode === "MONTH"
          ? `provider-statement-${selectedCountryCode}-${invoiceMonth}-${pid}.pdf`
          : `provider-statement-${selectedCountryCode}-${fromDate}-to-${toDate}-${pid}.pdf`;

      saveBlob(blob, label);
    } catch (e: any) {
      setError(e?.message || "Provider statement PDF failed");
    } finally {
      setSaving(false);
    }
  }

  const currency = useMemo(() => {
    const c = countries.find((x) => x.code === selectedCountryCode);
    return c?.currency || "ZAR";
  }, [countries, selectedCountryCode]);

  return (
    <div style={{ padding: 20, maxWidth: 1500 }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>Insurance Partners</h1>
      <p style={{ opacity: 0.8, marginBottom: 18 }}>
        Partners, codes, and insurance-job invoices. Generate invoices by Month or by Date Range,
        filter by Provider, and export PDF (when enabled on backend).
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

      {/* Header controls */}
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
                {c.code} — {c.name} {c.isActive ? "" : "(inactive)"}
              </option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: 420 }}>
          <label style={{ fontSize: 12, opacity: 0.75 }}>Partner</label>
          <select
            value={selectedPartnerId}
            onChange={(e) => setSelectedPartnerId(e.target.value)}
            style={inputStyle}
          >
            {partners.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
                {p.partnerCode ? ` (${p.partnerCode})` : ""}
                {p.isActive ? "" : " (inactive)"}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          {selectedPartner ? (
            <button
              onClick={() => togglePartnerActive(selectedPartner._id, !selectedPartner.isActive)}
              disabled={saving}
              style={secondaryBtn}
            >
              {selectedPartner.isActive ? "Disable partner" : "Enable partner"}
            </button>
          ) : null}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "440px 1fr", gap: 16 }}>
        {/* Left column */}
        <div style={{ display: "grid", gap: 16 }}>
          {/* Create partner */}
          <Card title="Create Partner">
            <Field label="Partner name">
              <input
                value={newPartnerName}
                onChange={(e) => setNewPartnerName(e.target.value)}
                placeholder="Example: ABC Insurance"
                style={inputStyle}
              />
            </Field>

            <Field label="Partner code (required)">
              <input
                value={newPartnerCode}
                onChange={(e) => setNewPartnerCode(e.target.value)}
                placeholder="Example: ABC / OUTSURANCE / DISCOVERY"
                style={inputStyle}
              />
            </Field>

            <Field label="Contact email (optional)">
              <input
                value={newPartnerEmail}
                onChange={(e) => setNewPartnerEmail(e.target.value)}
                placeholder="billing@abc.co.za"
                style={inputStyle}
              />
            </Field>

            <Field label="Contact phone (optional)">
              <input
                value={newPartnerPhone}
                onChange={(e) => setNewPartnerPhone(e.target.value)}
                placeholder="+27..."
                style={inputStyle}
              />
            </Field>

            <button onClick={onCreatePartner} disabled={saving || !selectedCountryCode} style={primaryBtn}>
              {saving ? "Saving..." : "Create Partner"}
            </button>
          </Card>

          {/* Generate codes */}
          <Card title="Generate Codes">
            <Field label="Number of codes">
              <input
                type="number"
                value={generateCount}
                onChange={(e) => setGenerateCount(Number(e.target.value))}
                min={1}
                max={5000}
                style={inputStyle}
              />
            </Field>

            <button onClick={onGenerateCodes} disabled={saving || !selectedPartnerId} style={blueBtn}>
              {saving ? "Working..." : "Generate Codes"}
            </button>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
              Codes are unique per partner + country.
            </div>
          </Card>

          {/* Invoice */}
          <Card title="Invoice Generation">
            <Field label="Mode">
              <select
                value={invoiceMode}
                onChange={(e) => setInvoiceMode(e.target.value as any)}
                style={inputStyle}
              >
                <option value="MONTH">Month (YYYY-MM)</option>
                <option value="RANGE">Date range (From → To)</option>
              </select>
            </Field>

            {invoiceMode === "MONTH" ? (
              <Field label="Month">
                <select value={invoiceMonth} onChange={(e) => setInvoiceMonth(e.target.value)} style={inputStyle}>
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="From">
                  <input value={fromDate} onChange={(e) => setFromDate(e.target.value)} type="date" style={inputStyle} />
                </Field>
                <Field label="To">
                  <input value={toDate} onChange={(e) => setToDate(e.target.value)} type="date" style={inputStyle} />
                </Field>
              </div>
            )}

            <Field label="Provider/Driver ID (for individual provider statement)">
              <input
                value={providerIdFilter}
                onChange={(e) => setProviderIdFilter(e.target.value)}
                placeholder="paste providerId here"
                style={inputStyle}
              />
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button onClick={onLoadInvoice} disabled={saving || !selectedPartnerId} style={greenBtn}>
                {saving ? "Loading..." : "Generate Invoice"}
              </button>

              <button onClick={onDownloadPartnerInvoicePdf} disabled={saving || !selectedPartnerId} style={secondaryBtn}>
                Download Partner Invoice PDF
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
              <button onClick={onDownloadProvidersSummaryPdf} disabled={saving || !selectedPartnerId} style={secondaryBtn}>
                Download Providers Summary PDF
              </button>

              <button
                onClick={onDownloadProviderStatementPdf}
                disabled={saving || !selectedPartnerId || !providerIdFilter.trim()}
                style={secondaryBtn}
                title={!providerIdFilter.trim() ? "Paste Provider/Driver ID to enable" : ""}
              >
                Download Provider Statement PDF
              </button>
            </div>

            {invoice ? (
              <div style={{ marginTop: 12, fontSize: 13, display: "grid", gap: 6 }}>
                <div>
                  <b>Total jobs:</b> {invoice.totals.totalJobs}
                </div>
                <div>
                  <b>Gross total (partner owes):</b> {invoice.totals.totalPartnerAmountDue} {currency}
                </div>
                <div>
                  <b>Booking fee waived:</b> {invoice.totals.totalBookingFeeWaived} {currency}
                </div>
                <div>
                  <b>Commission total:</b> {invoice.totals.totalCommission} {currency}
                </div>
                <div>
                  <b>Total provider amount due (NET):</b> {invoice.totals.totalProviderAmountDue} {currency}
                </div>
              </div>
            ) : null}
          </Card>
        </div>

        {/* Right column */}
        <div style={{ display: "grid", gap: 16 }}>
          {/* Codes */}
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, background: "white", overflow: "hidden" }}>
            <div
              style={{
                padding: 14,
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                gap: 10,
                alignItems: "center",
              }}
            >
              <div style={{ fontWeight: 900 }}>Codes ({codes.length})</div>

              <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
                <select
                  value={codeStatusFilter}
                  onChange={(e) => setCodeStatusFilter(e.target.value as any)}
                  style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #d1d5db" }}
                >
                  <option value="ALL">All</option>
                  <option value="ACTIVE">Active</option>
                  <option value="USED">Used</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="REVOKED">Revoked</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: 14, opacity: 0.7 }}>Loading...</div>
            ) : filteredCodes.length === 0 ? (
              <div style={{ padding: 14, opacity: 0.7 }}>No codes found.</div>
            ) : (
              <div style={{ maxHeight: 460, overflow: "auto" }}>
                {filteredCodes.map((c) => {
                  const st = normalizeCodeStatus(c);
                  const usedAt = c.usage?.lastUsedAt || null;

                  return (
                    <div
                      key={c._id}
                      style={{
                        padding: 12,
                        borderBottom: "1px solid #f3f4f6",
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 900, fontSize: 14 }}>{c.code}</div>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>
                          Status: <b>{st}</b> {usedAt ? `• Used: ${new Date(usedAt).toLocaleString()}` : ""}
                        </div>
                        {c.usage?.maxUses ? (
                          <div style={{ fontSize: 12, opacity: 0.75 }}>
                            Uses: {c.usage?.usedCount || 0}/{c.usage.maxUses}
                          </div>
                        ) : null}
                      </div>

                      <button
                        onClick={() => onDisableCode(c._id)}
                        disabled={saving || st !== "ACTIVE"}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 10,
                          border: "1px solid #ef4444",
                          background: st === "ACTIVE" ? "#ef4444" : "#fca5a5",
                          color: "white",
                          fontWeight: 900,
                          cursor: saving || st !== "ACTIVE" ? "not-allowed" : "pointer",
                        }}
                      >
                        Disable
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Invoice Items */}
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, background: "white", overflow: "hidden" }}>
            <div style={{ padding: 14, borderBottom: "1px solid #e5e7eb", fontWeight: 900 }}>
              Invoice Items {invoice ? `(${invoice.items.length})` : ""}
            </div>

            {!invoice ? (
              <div style={{ padding: 14, opacity: 0.7 }}>Generate an invoice to see items.</div>
            ) : invoice.items.length === 0 ? (
              <div style={{ padding: 14, opacity: 0.7 }}>No insurance jobs in this period.</div>
            ) : (
              <div style={{ maxHeight: 520, overflow: "auto" }}>
                {invoice.items.map((it) => (
                  <div key={it.jobId} style={{ padding: 12, borderBottom: "1px solid #f3f4f6" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontWeight: 900, fontSize: 14 }}>
                        Job {it.shortId} <span style={{ opacity: 0.6, fontWeight: 700 }}>({it.status})</span>
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>{new Date(it.createdAt).toLocaleString()}</div>
                    </div>

                    <div style={{ fontSize: 12, marginTop: 6 }}>
                      <b>Provider:</b> {it.provider?.name || "-"}{" "}
                      {it.provider?.providerId ? (
                        <span style={{ opacity: 0.7 }}>• {it.provider.providerId}</span>
                      ) : null}
                    </div>

                    <div style={{ fontSize: 12, marginTop: 6 }}>
                      <b>Pickup:</b> {it.pickupAddressText || "-"}
                    </div>
                    <div style={{ fontSize: 12 }}>
                      <b>Dropoff:</b> {it.dropoffAddressText || "-"}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
                      <div style={{ fontSize: 12 }}>
                        <b>Gross (job amount):</b> {it.pricing.estimatedTotal} {currency}
                      </div>
                      <div style={{ fontSize: 12 }}>
                        <b>Provider due (NET):</b> {it.pricing.providerAmountDue} {currency}
                      </div>
                    </div>

                    <div style={{ fontSize: 12, marginTop: 6, opacity: 0.85 }}>
                      <b>Insurance code:</b> {it.insurance.code || "-"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Grouped by provider */}
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, background: "white", overflow: "hidden" }}>
            <div style={{ padding: 14, borderBottom: "1px solid #e5e7eb", fontWeight: 900 }}>
              Providers Owed (from invoice)
            </div>

            {!invoice ? (
              <div style={{ padding: 14, opacity: 0.7 }}>Generate invoice to see provider totals.</div>
            ) : invoice.groupedByProvider.length === 0 ? (
              <div style={{ padding: 14, opacity: 0.7 }}>No assigned providers in this period.</div>
            ) : (
              <div style={{ maxHeight: 320, overflow: "auto" }}>
                {invoice.groupedByProvider.map((p) => (
                  <div key={p.providerId} style={{ padding: 12, borderBottom: "1px solid #f3f4f6" }}>
                    <div style={{ fontWeight: 900, fontSize: 13 }}>
                      {p.name || "Unknown Provider"}{" "}
                      <span style={{ opacity: 0.6, fontWeight: 700 }}>• {p.providerId}</span>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                      Jobs: <b>{p.jobCount}</b> • Net due: <b>{p.netTotalDue}</b> {currency}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "white" }}>
      <h2 style={{ fontSize: 16, fontWeight: 900, marginBottom: 10 }}>{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
      <label style={{ fontSize: 12, opacity: 0.75 }}>{label}</label>
      {children}
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
  marginTop: 10,
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #111827",
  background: "#111827",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
};

const blueBtn: React.CSSProperties = {
  marginTop: 10,
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #2563eb",
  background: "#2563eb",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
};

const greenBtn: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #10b981",
  background: "#10b981",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryBtn: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  background: "white",
  color: "#111827",
  fontWeight: 900,
  cursor: "pointer",
};