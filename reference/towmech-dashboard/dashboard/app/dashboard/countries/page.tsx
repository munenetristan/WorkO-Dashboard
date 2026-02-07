"use client";

import React, { useEffect, useMemo, useState } from "react";
import api from "@/lib/api/axios";

type Country = {
  _id?: string;

  // Common
  code: string;
  name: string;

  // Currency
  currency?: string;
  currencyCode?: string;
  currencySymbol?: string;

  // Language fields
  defaultLanguage?: string;
  supportedLanguages?: string[];
  languages?: string[];

  timezone?: string;
  isActive: boolean;
  isPublic?: boolean;

  // Dialing rules (legacy + new)
  dialCode?: string;
  dialingCode?: string; // ✅ new backend model field
  phoneRules?: {
    dialCode?: string;
    dialingCode?: string;
    callingCode?: string;
    countryCallingCode?: string;
  };

  createdAt?: string;
  updatedAt?: string;
};

function normalizeIso2(v: any) {
  const code = String(v || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : "";
}

function normalizeDialCode(v: any) {
  let s = String(v || "").trim();
  if (!s) return "";
  if (!s.startsWith("+")) s = "+" + s;
  s = "+" + s.replace(/[^\d]/g, "");
  return s === "+" ? "" : s;
}

function displayDialCode(c: Country) {
  return (
    c?.phoneRules?.dialCode ||
    c?.phoneRules?.dialingCode ||
    c?.dialingCode || // ✅ new backend
    c?.dialCode ||
    (c?.phoneRules?.countryCallingCode ? `+${c.phoneRules.countryCallingCode}` : "") ||
    ""
  );
}

function displayCurrency(c: Country) {
  return c.currencyCode || c.currency || "-";
}

function displayLanguages(c: Country) {
  const list = c.languages || c.supportedLanguages || [];
  return Array.isArray(list) && list.length ? list.join(", ") : "-";
}

/**
 * Builds a safe path that works with either:
 *   baseURL = https://api.towmech.com
 * or
 *   baseURL = https://api.towmech.com/api
 */
function withApiPrefix(path: string) {
  const base = (api.defaults.baseURL || "").replace(/\/$/, "");
  const alreadyHasApi = base.endsWith("/api") || base.includes("/api/");
  return `${alreadyHasApi ? "" : "/api"}${path.startsWith("/") ? "" : "/"}${path}`;
}

export default function CountriesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [countries, setCountries] = useState<Country[]>([]);

  // ✅ Create form (kept as-is)
  const [form, setForm] = useState({
    code: "",
    name: "",
    currency: "",
    dialCode: "",
    defaultLanguage: "en",
    supportedLanguages: "en",
    timezone: "Africa/Johannesburg",
    isActive: true,
    isPublic: true,
  });

  // ✅ Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editCountry, setEditCountry] = useState<Country | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    currency: "",
    dialCode: "",
    defaultLanguage: "en",
    supportedLanguages: "en",
    timezone: "Africa/Johannesburg",
    isActive: true,
  });

  const canSubmit = useMemo(() => {
    return (
      form.code.trim().length >= 2 &&
      form.name.trim().length >= 2 &&
      form.currency.trim().length >= 3
    );
  }, [form]);

  const canSubmitEdit = useMemo(() => {
    return (
      !!editCountry?._id &&
      editForm.name.trim().length >= 2 &&
      editForm.currency.trim().length >= 3
    );
  }, [editCountry, editForm]);

  async function loadCountries() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ countries?: Country[] }>(withApiPrefix("/admin/countries"));
      const list = Array.isArray(res.data?.countries) ? res.data.countries : [];
      setCountries(list);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to load countries");
    } finally {
      setLoading(false);
    }
  }

  async function createOrUpsertCountry() {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);

    const code = normalizeIso2(form.code);
    if (!code) {
      setError("Invalid country code (ISO2 required, e.g. ZA)");
      setSaving(false);
      return;
    }

    const dial = normalizeDialCode(form.dialCode);

    const payload: any = {
      code,
      name: form.name.trim(),

      // Send BOTH for compatibility
      currency: form.currency.trim().toUpperCase(),
      currencyCode: form.currency.trim().toUpperCase(),

      defaultLanguage: form.defaultLanguage.trim(),
      supportedLanguages: form.supportedLanguages
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      languages: form.supportedLanguages
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),

      timezone: form.timezone.trim(),
      isActive: !!form.isActive,
      isPublic: !!form.isPublic,
    };

    // ✅ NEW backend prefers dialingCode; we send both to be safe
    if (dial) {
      payload.dialingCode = dial;
      payload.dialCode = dial;

      // keep legacy controller compatibility if any still read phoneRules
      payload.phoneRules = {
        ...(payload.phoneRules || {}),
        dialCode: dial,
        dialingCode: dial,
        countryCallingCode: dial.replace(/^\+/, ""),
      };
    }

    try {
      // ✅ Your new backend route: POST /api/admin/countries
      await api.post(withApiPrefix(`/admin/countries`), payload);

      setForm({
        code: "",
        name: "",
        currency: "",
        dialCode: "",
        defaultLanguage: "en",
        supportedLanguages: "en",
        timezone: "Africa/Johannesburg",
        isActive: true,
        isPublic: true,
      });

      await loadCountries();
      return;
    } catch (e1: any) {
      // ✅ Backward compatibility fallback: PUT /api/admin/countries/:code (legacy controller)
      const status = e1?.response?.status;
      if ((status === 404 || status === 405) && code) {
        try {
          await api.put(withApiPrefix(`/admin/countries/${code}`), payload);
          await loadCountries();
          return;
        } catch (e2: any) {
          setError(e2?.response?.data?.message || e2?.message || "Failed to create country");
        }
      } else {
        setError(e1?.response?.data?.message || e1?.message || "Failed to create country");
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(country: Country) {
    setSaving(true);
    setError(null);

    const nextActive = !country.isActive;

    try {
      // ✅ Your new backend update route (by _id)
      if (country._id) {
        await api.patch(withApiPrefix(`/admin/countries/${country._id}`), { isActive: nextActive });
        setCountries((prev) =>
          prev.map((c) => (c._id === country._id ? { ...c, isActive: nextActive } : c))
        );
        return;
      }

      // fallback (legacy)
      const code = normalizeIso2(country.code);
      await api.patch(withApiPrefix(`/admin/countries/${code}/status`), { isActive: nextActive });
      setCountries((prev) =>
        prev.map((c) => (c.code === country.code ? { ...c, isActive: nextActive } : c))
      );
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to update country");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCountry(country: Country) {
    const ok = confirm(
      `Delete country ${country.code} (${country.name})?\n\nThis will remove it from the system.`
    );
    if (!ok) return;

    setSaving(true);
    setError(null);

    try {
      // ✅ Your new backend does NOT provide delete (safe), so keep legacy delete attempts
      const code = normalizeIso2(country.code);
      try {
        await api.delete(withApiPrefix(`/admin/countries/${code}`));
        setCountries((prev) => prev.filter((c) => c.code !== country.code));
        return;
      } catch (e1: any) {
        const status = e1?.response?.status;
        if ((status === 404 || status === 405) && country._id) {
          await api.delete(withApiPrefix(`/admin/countries/${country._id}`));
          setCountries((prev) => prev.filter((c) => c._id !== country._id));
          return;
        }
        throw e1;
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to delete country");
    } finally {
      setSaving(false);
    }
  }

  function openEditModal(c: Country) {
    setEditCountry(c);
    setEditForm({
      name: c.name || "",
      currency: (c.currencyCode || c.currency || "").toString(),
      dialCode: displayDialCode(c) || "",
      defaultLanguage: (c.defaultLanguage || "en").toString(),
      supportedLanguages: (c.supportedLanguages || c.languages || ["en"]).join(","),
      timezone: (c.timezone || "Africa/Johannesburg").toString(),
      isActive: !!c.isActive,
    });
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editCountry?._id) {
      setError("Cannot edit: missing country _id");
      return;
    }
    if (!canSubmitEdit) return;

    setSaving(true);
    setError(null);

    const dial = normalizeDialCode(editForm.dialCode);

    const payload: any = {
      name: editForm.name.trim(),
      currency: editForm.currency.trim().toUpperCase(),
      dialingCode: dial || undefined, // ✅ matches backend model field
      dialCode: dial || undefined, // ✅ compatibility
      defaultLanguage: editForm.defaultLanguage.trim().toLowerCase(),
      supportedLanguages: editForm.supportedLanguages
        .split(",")
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean),
      timezone: editForm.timezone.trim(),
      isActive: !!editForm.isActive,
    };

    try {
      // ✅ Your new backend: PATCH /api/admin/countries/:id
      await api.patch(withApiPrefix(`/admin/countries/${editCountry._id}`), payload);
      setEditOpen(false);
      setEditCountry(null);
      await loadCountries();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to update country");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadCountries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: 20, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Countries</h1>
      <p style={{ marginBottom: 20, opacity: 0.8 }}>
        Manage TowMech Global countries (activation, currency, language, timezone, dial code).
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

      {/* ✅ Add Country */}
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 16,
          marginBottom: 22,
          background: "white",
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Add Country</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
          }}
        >
          <div>
            <label style={{ fontSize: 12, opacity: 0.8 }}>Country Code (ISO2)</label>
            <input
              value={form.code}
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
              placeholder="ZA"
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, opacity: 0.8 }}>Country Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="South Africa"
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, opacity: 0.8 }}>Currency</label>
            <input
              value={form.currency}
              onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
              placeholder="ZAR"
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, opacity: 0.8 }}>Dial Code</label>
            <input
              value={form.dialCode}
              onChange={(e) => setForm((p) => ({ ...p, dialCode: e.target.value }))}
              placeholder="+27"
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
            />
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 6 }}>
              Stored as <b>dialingCode</b> in backend (e.g. +27).
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, opacity: 0.8 }}>Default Language</label>
            <input
              value={form.defaultLanguage}
              onChange={(e) => setForm((p) => ({ ...p, defaultLanguage: e.target.value }))}
              placeholder="en"
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, opacity: 0.8 }}>
              Supported Languages (comma separated)
            </label>
            <input
              value={form.supportedLanguages}
              onChange={(e) => setForm((p) => ({ ...p, supportedLanguages: e.target.value }))}
              placeholder="en,zu,af"
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, opacity: 0.8 }}>Timezone</label>
            <input
              value={form.timezone}
              onChange={(e) => setForm((p) => ({ ...p, timezone: e.target.value }))}
              placeholder="Africa/Johannesburg"
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 14, marginTop: 14, alignItems: "center" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
            />
            Active
          </label>

          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={form.isPublic}
              onChange={(e) => setForm((p) => ({ ...p, isPublic: e.target.checked }))}
            />
            Public
          </label>

          <button
            onClick={createOrUpsertCountry}
            disabled={!canSubmit || saving}
            style={{
              marginLeft: "auto",
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111827",
              background: saving ? "#9ca3af" : "#111827",
              color: "white",
              cursor: saving ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            {saving ? "Saving..." : "Save Country"}
          </button>
        </div>
      </div>

      {/* ✅ List */}
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 16,
          background: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Country List</h2>
          <button
            onClick={loadCountries}
            disabled={loading}
            style={{
              marginLeft: "auto",
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #d1d5db",
              background: "white",
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 16, opacity: 0.7 }}>Loading...</div>
        ) : countries.length === 0 ? (
          <div style={{ padding: 16, opacity: 0.7 }}>
            No countries yet. Add your first country above.
          </div>
        ) : (
          <div style={{ marginTop: 12, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left" }}>
                  <th style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>Code</th>
                  <th style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>Name</th>
                  <th style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>Dial</th>
                  <th style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>Currency</th>
                  <th style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>Languages</th>
                  <th style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>Timezone</th>
                  <th style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>Status</th>
                  <th style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {countries.map((c) => (
                  <tr key={c._id || c.code}>
                    <td
                      style={{
                        padding: 10,
                        borderBottom: "1px solid #f3f4f6",
                        fontWeight: 700,
                      }}
                    >
                      {c.code}
                    </td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6" }}>{c.name}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6" }}>
                      {displayDialCode(c) || "-"}
                    </td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6" }}>
                      {displayCurrency(c)}
                    </td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6" }}>
                      {displayLanguages(c)}
                    </td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6" }}>
                      {c.timezone || "-"}
                    </td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6" }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: 999,
                          fontSize: 12,
                          border: "1px solid #e5e7eb",
                          background: c.isActive ? "#ecfdf5" : "#fef2f2",
                        }}
                      >
                        {c.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: 10,
                        borderBottom: "1px solid #f3f4f6",
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        onClick={() => openEditModal(c)}
                        disabled={saving || !c._id}
                        title={!c._id ? "Missing _id (cannot edit). Reload countries." : "Edit country"}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 10,
                          border: "1px solid #111827",
                          background: "white",
                          cursor: saving ? "not-allowed" : "pointer",
                          fontWeight: 600,
                          opacity: !c._id ? 0.5 : 1,
                        }}
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => toggleActive(c)}
                        disabled={saving}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 10,
                          border: "1px solid #d1d5db",
                          background: "white",
                          cursor: "pointer",
                        }}
                      >
                        {c.isActive ? "Deactivate" : "Activate"}
                      </button>

                      <button
                        onClick={() => deleteCountry(c)}
                        disabled={saving}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 10,
                          border: "1px solid #ef4444",
                          background: "#fee2e2",
                          color: "#991b1b",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
              Note: The API client automatically sends <code>X-COUNTRY-CODE</code> from the selected
              dashboard workspace.
            </div>
          </div>
        )}
      </div>

      {/* ✅ Edit Modal (simple, no extra dependencies) */}
      {editOpen && editCountry ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 50,
          }}
          onClick={() => {
            if (!saving) setEditOpen(false);
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 720,
              background: "white",
              borderRadius: 14,
              border: "1px solid #e5e7eb",
              padding: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>
                Edit Country — {editCountry.code}
              </div>
              <button
                onClick={() => setEditOpen(false)}
                disabled={saving}
                style={{
                  marginLeft: "auto",
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  background: "white",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 12,
              }}
            >
              <div>
                <label style={{ fontSize: 12, opacity: 0.8 }}>Name</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, opacity: 0.8 }}>Currency</label>
                <input
                  value={editForm.currency}
                  onChange={(e) => setEditForm((p) => ({ ...p, currency: e.target.value }))}
                  placeholder="ZAR"
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, opacity: 0.8 }}>Dial Code</label>
                <input
                  value={editForm.dialCode}
                  onChange={(e) => setEditForm((p) => ({ ...p, dialCode: e.target.value }))}
                  placeholder="+27"
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, opacity: 0.8 }}>Default Language</label>
                <input
                  value={editForm.defaultLanguage}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, defaultLanguage: e.target.value }))
                  }
                  placeholder="en"
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                  }}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 12, opacity: 0.8 }}>
                  Supported Languages (comma separated)
                </label>
                <input
                  value={editForm.supportedLanguages}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, supportedLanguages: e.target.value }))
                  }
                  placeholder="en,zu,af"
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                  }}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 12, opacity: 0.8 }}>Timezone</label>
                <input
                  value={editForm.timezone}
                  onChange={(e) => setEditForm((p) => ({ ...p, timezone: e.target.value }))}
                  placeholder="Africa/Johannesburg"
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 14, marginTop: 14, alignItems: "center" }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm((p) => ({ ...p, isActive: e.target.checked }))}
                />
                Active
              </label>

              <button
                onClick={saveEdit}
                disabled={!canSubmitEdit || saving}
                style={{
                  marginLeft: "auto",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #111827",
                  background: saving ? "#9ca3af" : "#111827",
                  color: "white",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontWeight: 700,
                }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}