"use client";

import React, { useEffect, useMemo, useState } from "react";

type Country = {
  _id: string;
  code: string;
  name: string;
  currency: string;
  isActive: boolean;
};

type LegalDocType = "TERMS" | "PRIVACY" | "REFUND" | "DISPUTE";

type LegalDocument = {
  _id: string;
  countryCode: string;
  languageCode: string;
  type: LegalDocType;
  title: string;
  content: string;
  version: string;
  isActive: boolean;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
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

const DOC_TYPES: { key: LegalDocType; label: string }[] = [
  { key: "TERMS", label: "Terms & Conditions" },
  { key: "PRIVACY", label: "Privacy Policy" },
  { key: "REFUND", label: "Refund Policy" },
  { key: "DISPUTE", label: "Dispute Policy" },
];

const DEFAULT_LANGS = ["en", "sw", "fr", "pt", "ar"];

export default function LegalPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>("");

  const [type, setType] = useState<LegalDocType>("TERMS");
  const [languageCode, setLanguageCode] = useState<string>("en");

  const [docs, setDocs] = useState<LegalDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>("");

  const selectedDoc = useMemo(() => {
    return docs.find((d) => d._id === selectedDocId) || null;
  }, [docs, selectedDocId]);

  const country = useMemo(() => {
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

  async function loadDocs(countryCode: string, t: LegalDocType, lang: string) {
    const res = await fetch(
      `${API_BASE}/api/admin/legal?countryCode=${encodeURIComponent(
        countryCode
      )}&type=${encodeURIComponent(t)}&languageCode=${encodeURIComponent(lang)}`,
      {
        method: "GET",
        headers: authHeaders({ "X-COUNTRY-CODE": countryCode }),
      }
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data?.message || "Failed to load legal documents");
    }

    const list: LegalDocument[] = Array.isArray(data?.documents)
      ? data.documents
      : [];
    setDocs(list);

    // auto-select latest active or latest
    const active = list.find((d) => d.isActive);
    if (active) setSelectedDocId(active._id);
    else if (list.length > 0) setSelectedDocId(list[0]._id);
    else setSelectedDocId("");
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

    loadDocs(selectedCountryCode, type, languageCode)
      .catch((e: any) => setError(e?.message || "Failed to load documents"))
      .finally(() => setLoading(false));
  }, [selectedCountryCode, type, languageCode]);

  function setDocPatch(patch: Partial<LegalDocument>) {
    setDocs((prev) =>
      prev.map((d) => (d._id === selectedDocId ? { ...d, ...patch } : d))
    );
  }

  function newDocTemplate(): LegalDocument {
    return {
      _id: `local_${Date.now()}`,
      countryCode: selectedCountryCode,
      languageCode,
      type,
      title: `${DOC_TYPES.find((x) => x.key === type)?.label || "Document"} (${
        countryCodeToName(selectedCountryCode) || selectedCountryCode
      })`,
      content: "",
      version: "1.0.0",
      isActive: false,
      publishedAt: null,
    };
  }

  async function createNew() {
    const doc = newDocTemplate();
    setDocs((prev) => [doc, ...prev]);
    setSelectedDocId(doc._id);
  }

  async function save() {
    if (!selectedCountryCode) return;
    if (!selectedDoc) return;

    setSaving(true);
    setError(null);

    try {
      const payload = {
        countryCode: selectedCountryCode,
        type,
        languageCode,
        title: selectedDoc.title,
        content: selectedDoc.content,
        version: selectedDoc.version,
        isActive: selectedDoc.isActive,
      };

      // If it's a local doc -> create, else update
      const isLocal = selectedDoc._id.startsWith("local_");

      const res = await fetch(
        `${API_BASE}/api/admin/legal${isLocal ? "" : `/${selectedDoc._id}`}`,
        {
          method: isLocal ? "POST" : "PUT",
          headers: authHeaders({ "X-COUNTRY-CODE": selectedCountryCode }),
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Save failed");

      await loadDocs(selectedCountryCode, type, languageCode);
    } catch (e: any) {
      setError(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function publishActive() {
    if (!selectedCountryCode) return;
    if (!selectedDoc) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/admin/legal/publish`, {
        method: "POST",
        headers: authHeaders({ "X-COUNTRY-CODE": selectedCountryCode }),
        body: JSON.stringify({
          documentId: selectedDoc._id.startsWith("local_") ? null : selectedDoc._id,
          countryCode: selectedCountryCode,
          type,
          languageCode,
          title: selectedDoc.title,
          content: selectedDoc.content,
          version: selectedDoc.version,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Publish failed");

      await loadDocs(selectedCountryCode, type, languageCode);
    } catch (e: any) {
      setError(e?.message || "Publish failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 1300 }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>
        Legal Documents
      </h1>
      <p style={{ opacity: 0.8, marginBottom: 18 }}>
        Manage country-specific legal documents (Terms, Privacy, Refund, Dispute).
        You can publish one active document per type/language/country.
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

      {/* Filters */}
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
            <label style={{ fontSize: 12, opacity: 0.75 }}>Country</label>
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
            <label style={{ fontSize: 12, opacity: 0.75 }}>Document type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as LegalDocType)}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
            >
              {DOC_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ minWidth: 200 }}>
            <label style={{ fontSize: 12, opacity: 0.75 }}>Language</label>
            <select
              value={languageCode}
              onChange={(e) => setLanguageCode(e.target.value)}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
            >
              {DEFAULT_LANGS.map((l) => (
                <option key={l} value={l}>
                  {l.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <button
              onClick={createNew}
              disabled={!selectedCountryCode || saving}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #d1d5db",
                background: "white",
                cursor: "pointer",
              }}
            >
              + New
            </button>

            <button
              onClick={save}
              disabled={saving || loading || !selectedDoc}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #111827",
                background: saving ? "#9ca3af" : "#111827",
                color: "white",
                cursor: saving ? "not-allowed" : "pointer",
                fontWeight: 900,
              }}
            >
              {saving ? "Saving..." : "Save"}
            </button>

            <button
              onClick={publishActive}
              disabled={saving || loading || !selectedDoc}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #2563eb",
                background: saving ? "#93c5fd" : "#2563eb",
                color: "white",
                cursor: saving ? "not-allowed" : "pointer",
                fontWeight: 900,
              }}
            >
              {saving ? "Publishing..." : "Publish Active"}
            </button>
          </div>
        </div>

        {country ? (
          <div style={{ marginTop: 10, fontSize: 13, opacity: 0.75 }}>
            Country: <b>{country.name}</b> ({country.code})
          </div>
        ) : null}
      </div>

      {/* Content */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "380px 1fr",
          gap: 16,
        }}
      >
        {/* Left: list */}
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            background: "white",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: 14,
              borderBottom: "1px solid #e5e7eb",
              fontWeight: 900,
            }}
          >
            Documents ({docs.length})
          </div>

          {loading ? (
            <div style={{ padding: 14, opacity: 0.7 }}>Loading...</div>
          ) : docs.length === 0 ? (
            <div style={{ padding: 14, opacity: 0.7 }}>
              No documents yet for this selection.
            </div>
          ) : (
            <div style={{ maxHeight: 620, overflow: "auto" }}>
              {docs.map((d) => {
                const isSelected = d._id === selectedDocId;
                return (
                  <button
                    key={d._id}
                    onClick={() => setSelectedDocId(d._id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: 12,
                      border: "none",
                      borderBottom: "1px solid #f3f4f6",
                      background: isSelected ? "#f9fafb" : "white",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 900, fontSize: 14 }}>
                      {d.title || "(Untitled)"}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                      Version: <b>{d.version || "-"}</b> •{" "}
                      {d.isActive ? "ACTIVE ✅" : "inactive"}
                    </div>
                    {d.publishedAt ? (
                      <div style={{ fontSize: 12, opacity: 0.75 }}>
                        Published: {new Date(d.publishedAt).toLocaleString()}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: editor */}
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            background: "white",
            padding: 16,
          }}
        >
          {!selectedDoc ? (
            <div style={{ opacity: 0.7, padding: 12 }}>
              Select a document to edit.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 180px 140px",
                  gap: 12,
                }}
              >
                <Input
                  label="Title"
                  value={selectedDoc.title || ""}
                  onChange={(v) => setDocPatch({ title: v })}
                />
                <Input
                  label="Version"
                  value={selectedDoc.version || ""}
                  onChange={(v) => setDocPatch({ version: v })}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, opacity: 0.75 }}>Active</label>
                  <select
                    value={selectedDoc.isActive ? "yes" : "no"}
                    onChange={(e) => setDocPatch({ isActive: e.target.value === "yes" })}
                    style={{
                      padding: 10,
                      borderRadius: 10,
                      border: "1px solid #d1d5db",
                      width: "100%",
                    }}
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, opacity: 0.75 }}>
                  Content (Markdown / Plain Text)
                </label>
                <textarea
                  value={selectedDoc.content || ""}
                  onChange={(e) => setDocPatch({ content: e.target.value })}
                  rows={22}
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #d1d5db",
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                    fontSize: 13,
                  }}
                />
              </div>

              <div style={{ fontSize: 12, opacity: 0.75 }}>
                Tip: Click <b>Publish Active</b> to ensure this becomes the active
                legal document for this country/type/language.
              </div>
            </div>
          )}
        </div>
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

function countryCodeToName(code: string) {
  if (!code) return "";
  return code.toUpperCase();
}