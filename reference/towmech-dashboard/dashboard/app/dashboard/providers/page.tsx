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

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

export default function ProvidersPage() {
  const [tab, setTab] = useState<TabKey>("pending");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  // ✅ country scoping (multi-country)
  const { countryCode } = useCountryStore();

  // ✅ modal state
  const [open, setOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [docs, setDocs] = useState<VerificationDocs | null>(null);

  const loadProviders = async (activeTab: TabKey) => {
    setLoading(true);
    setError(null);

    try {
      let data;
      if (activeTab === "pending") data = await fetchPendingProviders();
      else if (activeTab === "approved") data = await fetchApprovedProviders();
      else data = await fetchRejectedProviders();

      const list = data?.providers || data?.data || [];
      setProviders(list);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to load providers.";
      setError(msg);
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
    if (!search) return providers;
    const s = search.toLowerCase();
    return providers.filter((p) => {
      return (
        (p.name || "").toLowerCase().includes(s) ||
        (p.email || "").toLowerCase().includes(s) ||
        (p.role || "").toLowerCase().includes(s)
      );
    });
  }, [providers, search]);

  const handleApprove = async (id: string) => {
    setActionLoadingId(id);
    try {
      await approveProvider(id);
      await loadProviders(tab);
      setOpen(false);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Approve failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoadingId(id);
    try {
      await rejectProvider(id);
      await loadProviders(tab);
      setOpen(false);
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
    setOpen(true);

    try {
      const data = await fetchProviderVerification(provider._id);
      setDocs(data?.verificationDocs || null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to load documents.";
      setDocsError(msg);
    } finally {
      setDocsLoading(false);
    }
  };

  // ✅ Status actions (uses adminUsers routes)
  const suspendUser = async (id: string) => {
    setActionLoadingId(id);
    try {
      await api.patch(withApiPrefix(`/admin/users/${id}/suspend`), { reason: "Suspended by admin" });
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
      await api.patch(withApiPrefix(`/admin/users/${id}/ban`), { reason: "Banned by admin" });
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
      <div className="space-y-2 rounded-lg border p-3">
        <div className="text-sm font-medium text-slate-800">{label}</div>

        {!url ? (
          <div className="text-sm text-muted-foreground">No file uploaded yet.</div>
        ) : (
          <div className="space-y-2">
            <img
              src={url}
              alt={label}
              className="h-44 w-full rounded-md object-cover border"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />

            <a href={url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline">
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
          active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
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
            <div className="py-10 text-center text-sm text-muted-foreground">Loading providers...</div>
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
                    <TableHead>Account</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredProviders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                        No providers found ✅
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProviders.map((p) => {
                      const st = p.accountStatus || {};
                      const busy = actionLoadingId === p._id;

                      return (
                        <TableRow key={p._id}>
                          <TableCell className="font-medium">{p.name || "—"}</TableCell>
                          <TableCell>{p.email || "—"}</TableCell>

                          <TableCell>
                            <Badge variant="secondary">
                              {p.role === "TOW_TRUCK"
                                ? "Tow Truck"
                                : p.role === "MECHANIC"
                                ? "Mechanic"
                                : p.role}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            <Badge variant="secondary">{p.providerProfile?.verificationStatus || "—"}</Badge>
                          </TableCell>

                          <TableCell>{statusPill(p)}</TableCell>

                          <TableCell>
                            {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—"}
                          </TableCell>

                          <TableCell className="text-right space-x-2">
                            <Button size="sm" variant="outline" onClick={() => openDocs(p)}>
                              View Docs
                            </Button>

                            {/* Verify actions */}
                            {tab === "pending" && (
                              <>
                                <Button size="sm" disabled={busy} onClick={() => handleApprove(p._id)}>
                                  {busy ? "..." : "Approve"}
                                </Button>

                                <Button
                                  size="sm"
                                  variant="destructive"
                                  disabled={busy}
                                  onClick={() => handleReject(p._id)}
                                >
                                  {busy ? "..." : "Reject"}
                                </Button>
                              </>
                            )}

                            {/* ✅ Account controls */}
                            {!st.isSuspended ? (
                              <Button size="sm" disabled={busy} onClick={() => suspendUser(p._id)}>
                                {busy ? "..." : "Suspend"}
                              </Button>
                            ) : (
                              <Button size="sm" variant="secondary" disabled={busy} onClick={() => unsuspendUser(p._id)}>
                                {busy ? "..." : "Unsuspend"}
                              </Button>
                            )}

                            {!st.isBanned ? (
                              <Button size="sm" variant="destructive" disabled={busy} onClick={() => banUser(p._id)}>
                                {busy ? "..." : "Ban"}
                              </Button>
                            ) : (
                              <Button size="sm" variant="secondary" disabled={busy} onClick={() => unbanUser(p._id)}>
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

      {/* Docs Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Verification Documents - {selectedProvider?.name || "Provider"}</DialogTitle>
          </DialogHeader>

          {docsLoading && (
            <div className="py-10 text-center text-sm text-muted-foreground">Loading documents...</div>
          )}

          {docsError && <div className="py-10 text-center text-sm text-red-600">{docsError}</div>}

          {!docsLoading && !docsError && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {renderDoc("ID Document", docs?.idDocumentUrl)}
                {renderDoc("License", docs?.licenseUrl)}
                {renderDoc("Vehicle Proof", docs?.vehicleProofUrl)}
                {renderDoc("Workshop Proof", docs?.workshopProofUrl)}
              </div>

              {selectedProvider && tab === "pending" && (
                <div className="flex justify-end gap-2 border-t pt-4">
                  <Button
                    disabled={actionLoadingId === selectedProvider._id}
                    onClick={() => handleApprove(selectedProvider._id)}
                  >
                    {actionLoadingId === selectedProvider._id ? "..." : "Approve"}
                  </Button>

                  <Button
                    variant="destructive"
                    disabled={actionLoadingId === selectedProvider._id}
                    onClick={() => handleReject(selectedProvider._id)}
                  >
                    {actionLoadingId === selectedProvider._id ? "..." : "Reject"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}