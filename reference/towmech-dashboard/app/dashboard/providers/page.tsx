"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api/axios";

import { ModuleHeader } from "@/components/dashboard/module-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  fetchPendingProviders,
  fetchApprovedProviders,
  fetchRejectedProviders,
  approveProvider,
  rejectProvider,
  fetchProviderVerification,
} from "@/lib/api/providers";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useCountryStore } from "@/lib/store/countryStore";

type Provider = {
  _id: string;
  name?: string;
  email?: string;
  role?: string;
  createdAt?: string;
  countryCode?: string;

  providerProfile?: {
    verificationStatus?: string;
    rejectReason?: string | null; // optional if backend provides it
    rejectedReason?: string | null; // common alternate field
    rejectionReason?: string | null; // common alternate field
  };

  accountStatus?: {
    isSuspended?: boolean;
    isBanned?: boolean;
    isArchived?: boolean;
  };
};

type VerificationDocs = {
  idDocumentUrl?: string | null;
  licenseUrl?: string | null;
  vehicleProofUrl?: string | null;
  workshopProofUrl?: string | null;
};

type TabKey = "pending" | "approved" | "rejected";

function withApiPrefix(path: string) {
  const base = (api.defaults.baseURL || "").replace(/\/$/, "");
  const alreadyHasApi = base.endsWith("/api") || base.includes("/api/");
  return `${alreadyHasApi ? "" : "/api"}${path.startsWith("/") ? "" : "/"}${path}`;
}

function normalizeRole(r?: string) {
  const x = String(r || "").trim().toUpperCase();
  if (x === "TOW_TRUCK" || x === "TOWTRUCK") return "Tow Truck";
  if (x === "MECHANIC") return "Mechanic";
  return x || "—";
}

function getRejectReason(p?: Provider | null) {
  return (
    p?.providerProfile?.rejectReason ||
    p?.providerProfile?.rejectedReason ||
    p?.providerProfile?.rejectionReason ||
    null
  );
}

export default function ProvidersPage() {
  const [tab, setTab] = useState<TabKey>("pending");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  // ✅ country scoping (multi-country)
  const { countryCode } = useCountryStore();

  // ✅ docs modal state
  const [openDocsModal, setOpenDocsModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [docs, setDocs] = useState<VerificationDocs | null>(null);

  // ✅ reject modal state (with reason)
  const [openRejectModal, setOpenRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<Provider | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("");

  const loadProviders = async (activeTab: TabKey) => {
    setLoading(true);
    setError(null);

    try {
      let data;
      if (activeTab === "pending") data = await fetchPendingProviders();
      else if (activeTab === "approved") data = await fetchApprovedProviders();
      else data = await fetchRejectedProviders();

      const list = data?.providers || data?.data || [];
      setProviders(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load providers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!countryCode) {
      setProviders([]);
      setLoading(false);
      setError("Please select a country first.");
      return;
    }
    loadProviders(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, countryCode]);

  const filteredProviders = useMemo(() => {
    const list = Array.isArray(providers) ? providers : [];
    const s = search.trim().toLowerCase();
    if (!s) return list;

    return list.filter((p) => {
      return (
        (p.name || "").toLowerCase().includes(s) ||
        (p.email || "").toLowerCase().includes(s) ||
        (p.role || "").toLowerCase().includes(s) ||
        (p.providerProfile?.verificationStatus || "").toLowerCase().includes(s)
      );
    });
  }, [providers, search]);

  const handleApprove = async (id: string) => {
    setActionLoadingId(id);
    try {
      await approveProvider(id);
      await loadProviders(tab);
      setOpenDocsModal(false);
      setOpenRejectModal(false);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Approve failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  // ✅ reject with reason (tries multiple payload keys so it works with most backends)
  const handleReject = async (id: string, reasonText: string) => {
    const reason = reasonText.trim();
    if (!reason) {
      alert("Please add a reject reason.");
      return;
    }

    setActionLoadingId(id);
    try {
      // rejectProvider signature may be (id) only; passing a second arg is safe only if your wrapper supports it.
      // So we call it, and if it fails, we fallback to direct PATCH with common payload keys.
      try {
        // @ts-ignore - allow optional reason if implemented
        await rejectProvider(id, { reason, rejectReason: reason, message: reason });
      } catch (_e) {
        await api.patch(withApiPrefix(`/admin/providers/${id}/reject`), {
          reason,
          rejectReason: reason,
          message: reason,
        });
      }

      await loadProviders(tab);
      setOpenDocsModal(false);
      setOpenRejectModal(false);
      setRejectTarget(null);
      setRejectReason("");
    } catch (err: any) {
      alert(err?.response?.data?.message || "Reject failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const openDocs = async (provider: Provider) => {
    setSelectedProvider(provider);
    setDocsLoading(true);
    setDocsError(null);
    setDocs(null);
    setOpenDocsModal(true);

    try {
      const data = await fetchProviderVerification(provider._id);
      setDocs(data?.verificationDocs || null);
    } catch (err: any) {
      setDocsError(err?.response?.data?.message || "Failed to load documents.");
    } finally {
      setDocsLoading(false);
    }
  };

  const openReject = (provider: Provider) => {
    setRejectTarget(provider);
    setRejectReason(getRejectReason(provider) || "");
    setOpenRejectModal(true);
  };

  // ✅ Status actions (uses adminUsers routes)
  const suspendUser = async (id: string) => {
    setActionLoadingId(id);
    try {
      await api.patch(withApiPrefix(`/admin/users/${id}/suspend`), {
        reason: "Suspended by admin",
      });
      await loadProviders(tab);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Suspend failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const unsuspendUser = async (id: string) => {
    setActionLoadingId(id);
    try {
      await api.patch(withApiPrefix(`/admin/users/${id}/unsuspend`), {});
      await loadProviders(tab);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Unsuspend failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const banUser = async (id: string) => {
    setActionLoadingId(id);
    try {
      await api.patch(withApiPrefix(`/admin/users/${id}/ban`), {
        reason: "Banned by admin",
      });
      await loadProviders(tab);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Ban failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const unbanUser = async (id: string) => {
    setActionLoadingId(id);
    try {
      await api.patch(withApiPrefix(`/admin/users/${id}/unban`), {});
      await loadProviders(tab);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Unban failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const renderDoc = (label: string, url?: string | null) => {
    return (
      <div className="space-y-2 rounded-lg border p-3 bg-white">
        <div className="text-sm font-medium text-slate-800">{label}</div>

        {!url ? (
          <div className="text-sm text-muted-foreground">No file uploaded yet.</div>
        ) : (
          <div className="space-y-2">
            {/* If it's a PDF or non-image, hide preview and show a link */}
            {/* We attempt an image preview; if it errors, it disappears but link remains */}
            <img
              src={url}
              alt={label}
              className="h-44 w-full rounded-md object-cover border bg-white"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />

            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-blue-600 underline"
            >
              Open {label}
            </a>
          </div>
        )}
      </div>
    );
  };

  const tabButton = (key: TabKey, label: string) => {
    const active = tab === key;
    return (
      <button
        onClick={() => setTab(key)}
        className={`rounded-md px-4 py-2 text-sm font-medium transition ${
          active
            ? "bg-slate-900 text-white"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
        }`}
      >
        {label}
      </button>
    );
  };

  const statusPill = (p: Provider) => {
    const st = p.accountStatus || {};
    if (st.isBanned) return <Badge className="bg-red-600 text-white">BANNED</Badge>;
    if (st.isSuspended) return <Badge className="bg-orange-600 text-white">SUSPENDED</Badge>;
    if (st.isArchived) return <Badge className="bg-slate-700 text-white">ARCHIVED</Badge>;
    return <Badge className="bg-green-600 text-white">ACTIVE</Badge>;
  };

  const verificationPill = (p: Provider) => {
    const v = String(p.providerProfile?.verificationStatus || "").toUpperCase();
    if (!v) return <Badge variant="secondary">—</Badge>;
    if (v.includes("APPROV")) return <Badge className="bg-green-600 text-white">APPROVED</Badge>;
    if (v.includes("REJECT")) return <Badge className="bg-red-600 text-white">REJECTED</Badge>;
    if (v.includes("PEND")) return <Badge className="bg-yellow-600 text-white">PENDING</Badge>;
    return <Badge variant="secondary">{v}</Badge>;
  };

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Driver & Provider Management"
        description="Verify and manage mechanics and tow truck providers."
      />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabButton("pending", "Pending")}
        {tabButton("approved", "Approved")}
        {tabButton("rejected", "Rejected")}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-base">
            {tab === "pending"
              ? "Pending Provider Verifications"
              : tab === "approved"
              ? "Approved Providers"
              : "Rejected Providers"}
          </CardTitle>

          <Input
            className="max-w-sm"
            placeholder="Search by name, email, type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardHeader>

        <CardContent>
          {loading && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Loading providers...
            </div>
          )}

          {error && <div className="py-10 text-center text-sm text-red-600">{error}</div>}

          {!loading && !error && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Verification</TableHead>
                    {tab === "rejected" ? <TableHead>Reject Reason</TableHead> : null}
                    <TableHead>Account</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredProviders.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={tab === "rejected" ? 8 : 7}
                        className="text-center py-8 text-sm text-muted-foreground"
                      >
                        No providers found ✅
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProviders.map((p) => {
                      const st = p.accountStatus || {};
                      const busy = actionLoadingId === p._id;
                      const reason = getRejectReason(p);

                      return (
                        <TableRow key={p._id}>
                          <TableCell className="font-medium">{p.name || "—"}</TableCell>
                          <TableCell>{p.email || "—"}</TableCell>

                          <TableCell>
                            <Badge variant="secondary">{normalizeRole(p.role)}</Badge>
                          </TableCell>

                          <TableCell>{verificationPill(p)}</TableCell>

                          {tab === "rejected" ? (
                            <TableCell className="max-w-[260px]">
                              <div className="text-sm text-slate-700 line-clamp-2">
                                {reason || "—"}
                              </div>
                            </TableCell>
                          ) : null}

                          <TableCell>{statusPill(p)}</TableCell>

                          <TableCell>
                            {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—"}
                          </TableCell>

                          <TableCell className="text-right space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDocs(p)}
                            >
                              View Docs
                            </Button>

                            {/* ✅ Approve should exist for rejected too */}
                            {(tab === "pending" || tab === "rejected") && (
                              <Button
                                size="sm"
                                disabled={busy}
                                onClick={() => handleApprove(p._id)}
                              >
                                {busy ? "..." : "Approve"}
                              </Button>
                            )}

                            {/* ✅ Reject available on pending + approved (optional) */}
                            {tab !== "rejected" && (
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={busy}
                                onClick={() => openReject(p)}
                              >
                                Reject
                              </Button>
                            )}

                            {/* ✅ Account controls */}
                            {!st.isSuspended ? (
                              <Button size="sm" disabled={busy} onClick={() => suspendUser(p._id)}>
                                {busy ? "..." : "Suspend"}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={busy}
                                onClick={() => unsuspendUser(p._id)}
                              >
                                {busy ? "..." : "Unsuspend"}
                              </Button>
                            )}

                            {!st.isBanned ? (
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={busy}
                                onClick={() => banUser(p._id)}
                              >
                                {busy ? "..." : "Ban"}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={busy}
                                onClick={() => unbanUser(p._id)}
                              >
                                {busy ? "..." : "Unban"}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ✅ Docs Modal (fixed visibility + scroll) */}
      <Dialog
        open={openDocsModal}
        onOpenChange={(v) => {
          setOpenDocsModal(v);
          if (!v) {
            setSelectedProvider(null);
            setDocs(null);
            setDocsError(null);
            setDocsLoading(false);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden bg-white">
          <DialogHeader>
            <DialogTitle>
              Verification Documents - {selectedProvider?.name || "Provider"}
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[72vh] overflow-y-auto pr-1">
            {docsLoading && (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Loading documents...
              </div>
            )}

            {docsError && (
              <div className="py-10 text-center text-sm text-red-600">{docsError}</div>
            )}

            {!docsLoading && !docsError && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {renderDoc("ID Document", docs?.idDocumentUrl)}
                  {renderDoc("License", docs?.licenseUrl)}
                  {renderDoc("Vehicle Proof", docs?.vehicleProofUrl)}
                  {renderDoc("Workshop Proof", docs?.workshopProofUrl)}
                </div>

                {/* ✅ Actions for pending & rejected inside modal */}
                {selectedProvider && (tab === "pending" || tab === "rejected") && (
                  <div className="flex justify-end gap-2 border-t pt-4">
                    <Button
                      disabled={actionLoadingId === selectedProvider._id}
                      onClick={() => handleApprove(selectedProvider._id)}
                    >
                      {actionLoadingId === selectedProvider._id ? "..." : "Approve"}
                    </Button>

                    {/* still allow reject from modal only if NOT already rejected */}
                    {tab !== "rejected" && (
                      <Button
                        variant="destructive"
                        disabled={actionLoadingId === selectedProvider._id}
                        onClick={() => openReject(selectedProvider)}
                      >
                        Reject
                      </Button>
                    )}
                  </div>
                )}

                {/* ✅ Show reject reason (if any) */}
                {selectedProvider && getRejectReason(selectedProvider) ? (
                  <div className="rounded-md border p-3 bg-white">
                    <div className="text-xs text-muted-foreground">Reject reason</div>
                    <div className="text-sm font-medium text-slate-900">
                      {getRejectReason(selectedProvider)}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ✅ Reject Modal (captures reason) */}
      <Dialog
        open={openRejectModal}
        onOpenChange={(v) => {
          setOpenRejectModal(v);
          if (!v) {
            setRejectTarget(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent className="max-w-xl max-h-[85vh] overflow-hidden bg-white">
          <DialogHeader>
            <DialogTitle>Reject Provider</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-md border p-3 bg-white">
              <div className="text-sm font-medium text-slate-900">
                {rejectTarget?.name || "Provider"}
              </div>
              <div className="text-xs text-muted-foreground">{rejectTarget?.email || ""}</div>
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium">Reject reason</div>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why this provider is rejected (missing docs, invalid license, etc.)"
                className="w-full min-h-[120px] rounded-md border border-input bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="text-xs text-muted-foreground">
                This helps providers know what to fix before re-submitting documents.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setOpenRejectModal(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={!rejectTarget || actionLoadingId === rejectTarget?._id}
                onClick={() => rejectTarget && handleReject(rejectTarget._id, rejectReason)}
              >
                {rejectTarget && actionLoadingId === rejectTarget._id ? "..." : "Reject"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}