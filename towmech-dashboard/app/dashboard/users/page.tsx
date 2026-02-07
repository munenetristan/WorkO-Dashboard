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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { fetchUsers } from "@/lib/api/users";
import { useCountryStore } from "@/lib/store/countryStore";

type User = {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  isVerified?: boolean;
  isBlocked?: boolean;
  createdAt?: string;
  countryCode?: string;
  lastLoginAt?: string;

  accountStatus?: {
    isSuspended?: boolean;
    isBanned?: boolean;
    isArchived?: boolean;
    suspendedReason?: string | null;
    bannedReason?: string | null;
  };
};

function withApiPrefix(path: string) {
  const base = (api.defaults.baseURL || "").replace(/\/$/, "");
  const alreadyHasApi = base.endsWith("/api") || base.includes("/api/");
  return `${alreadyHasApi ? "" : "/api"}${path.startsWith("/") ? "" : "/"}${path}`;
}

function roleNorm(r?: string) {
  return String(r || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function isHiddenAdminRole(role?: string) {
  const r = roleNorm(role);
  return (
    r === "admin" ||
    r === "superadmin" ||
    r === "creationadmin" ||
    r === "createdadmin" ||
    r === "admincreation"
  );
}

type RoleFilter = "ALL" | "CUSTOMER" | "MECHANIC" | "TOWTRUCK";
type SortMode = "LATEST" | "NAME_ASC";

function matchesRoleFilter(u: User, roleFilter: RoleFilter) {
  if (roleFilter === "ALL") return true;
  const r = roleNorm(u.role);
  if (roleFilter === "CUSTOMER") return r === "customer";
  if (roleFilter === "MECHANIC") return r === "mechanic";
  if (roleFilter === "TOWTRUCK") return r === "towtruck";
  return true;
}

function safeDateMs(d?: string) {
  const t = d ? new Date(d).getTime() : NaN;
  return Number.isFinite(t) ? t : 0;
}

function prettyBool(v: any) {
  return v ? "Yes" : "No";
}

function val(v: any) {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

function pickUserFromDetailsPayload(payload: any): any {
  if (!payload) return null;
  // common shapes: {user:{...}}, {...}
  if (payload.user && typeof payload.user === "object") return payload.user;
  return payload;
}

function fmtDate(d?: any) {
  if (!d) return "—";
  const t = new Date(d).getTime();
  if (!Number.isFinite(t)) return "—";
  return new Date(d).toLocaleString();
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [sortMode, setSortMode] = useState<SortMode>("LATEST");

  // modals
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rawOpen, setRawOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailsPayload, setDetailsPayload] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const { countryCode } = useCountryStore();

  const loadUsers = async () => {
    if (!countryCode) {
      setUsers([]);
      setLoading(false);
      setError("Please select a country first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchUsers();
      const list = data?.users || data?.data || data || [];
      setUsers(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load users. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryCode]);

  const visibleUsers = useMemo(() => users.filter((u) => !isHiddenAdminRole(u.role)), [users]);

  const filteredUsers = useMemo(() => {
    let list = visibleUsers.filter((u) => matchesRoleFilter(u, roleFilter));

    const s = search.trim().toLowerCase();
    if (s) {
      list = list.filter((u) => {
        return (
          (u.name || "").toLowerCase().includes(s) ||
          (u.email || "").toLowerCase().includes(s) ||
          (u.phone || "").toLowerCase().includes(s)
        );
      });
    }

    const sorted = [...list];
    if (sortMode === "LATEST") {
      sorted.sort((a, b) => safeDateMs(b.createdAt) - safeDateMs(a.createdAt));
    } else {
      sorted.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    }

    return sorted;
  }, [visibleUsers, roleFilter, search, sortMode]);

  const totalUsers = visibleUsers.length;
  const verifiedUsers = visibleUsers.filter((u) => u.isVerified).length;
  const blockedUsers = visibleUsers.filter((u) => u.isBlocked).length;

  const suspendUser = async (id: string) => {
    setActionLoadingId(id);
    try {
      await api.patch(withApiPrefix(`/admin/users/${id}/suspend`), { reason: "Suspended by admin" });
      await loadUsers();
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
      await loadUsers();
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
      await loadUsers();
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
      await loadUsers();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Unban failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const statusPill = (u: User) => {
    const st = u.accountStatus || {};
    if (st.isBanned) return <Badge className="bg-red-600 text-white">BANNED</Badge>;
    if (st.isSuspended) return <Badge className="bg-orange-600 text-white">SUSPENDED</Badge>;
    if (st.isArchived) return <Badge className="bg-slate-700 text-white">ARCHIVED</Badge>;
    return <Badge className="bg-green-600 text-white">ACTIVE</Badge>;
  };

  async function fetchUserDetails(u: User) {
    setSelectedUser(u);
    setDetailsPayload(null);
    setDetailsLoading(true);

    try {
      const res = await api.get(withApiPrefix(`/admin/users/${u._id}`));
      setDetailsPayload(res?.data || null);
    } catch (_e) {
      // fallback to list item only
      setDetailsPayload(null);
    } finally {
      setDetailsLoading(false);
    }
  }

  async function openDetails(u: User) {
    setDetailsOpen(true);
    setRawOpen(false);
    await fetchUserDetails(u);
  }

  async function openRaw(u: User) {
    setRawOpen(true);
    setDetailsOpen(false);
    await fetchUserDetails(u);
  }

  const filterPillClass =
    "h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

  const detailsUser = useMemo(() => {
    const fromPayload = pickUserFromDetailsPayload(detailsPayload);
    return (fromPayload || selectedUser) as any;
  }, [detailsPayload, selectedUser]);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="User Management"
        description="Track customer accounts, activity trends, and verification status."
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Verified Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{verifiedUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Blocked Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{blockedUsers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filters */}
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <CardTitle className="text-base">Users</CardTitle>

            <select
              className={filterPillClass}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
              aria-label="Filter by role"
            >
              <option value="ALL">All roles</option>
              <option value="CUSTOMER">Customer</option>
              <option value="MECHANIC">Mechanic</option>
              <option value="TOWTRUCK">TowTruck</option>
            </select>

            <select
              className={filterPillClass}
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              aria-label="Sort users"
            >
              <option value="LATEST">Latest joined</option>
              <option value="NAME_ASC">Name (A → Z)</option>
            </select>
          </div>

          <Input
            className="max-w-sm"
            placeholder="Search by name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardHeader>

        <CardContent>
          {loading && (
            <div className="py-10 text-center text-sm text-muted-foreground">Loading users...</div>
          )}

          {error && <div className="py-10 text-center text-sm text-red-600">{error}</div>}

          {!loading && !error && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                        No users found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((u) => {
                      const st = u.accountStatus || {};
                      const busy = actionLoadingId === u._id;

                      return (
                        <TableRow key={u._id}>
                          <TableCell className="font-medium">{u.name || "—"}</TableCell>
                          <TableCell>{u.email || "—"}</TableCell>
                          <TableCell>{u.phone || "—"}</TableCell>

                          <TableCell>
                            <Badge variant="secondary">{u.role || "—"}</Badge>
                          </TableCell>

                          <TableCell>
                            <div className="flex flex-wrap gap-2 items-center">
                              {u.isVerified ? (
                                <Badge variant="default">Verified</Badge>
                              ) : (
                                <Badge variant="secondary">Unverified</Badge>
                              )}

                              {u.isBlocked && <Badge className="bg-red-600 text-white">Blocked</Badge>}

                              {statusPill(u)}
                            </div>
                          </TableCell>

                          <TableCell>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</TableCell>

                          <TableCell className="text-right space-x-2">
                            {/* ✅ separate buttons */}
                            <Button size="sm" variant="outline" disabled={busy} onClick={() => openDetails(u)}>
                              Details
                            </Button>
                            <Button size="sm" variant="secondary" disabled={busy} onClick={() => openRaw(u)}>
                              Raw
                            </Button>

                            {!st.isSuspended ? (
                              <Button size="sm" disabled={busy} onClick={() => suspendUser(u._id)}>
                                {busy ? "..." : "Suspend"}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={busy}
                                onClick={() => unsuspendUser(u._id)}
                              >
                                {busy ? "..." : "Unsuspend"}
                              </Button>
                            )}

                            {!st.isBanned ? (
                              <Button size="sm" variant="destructive" disabled={busy} onClick={() => banUser(u._id)}>
                                {busy ? "..." : "Ban"}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={busy}
                                onClick={() => unbanUser(u._id)}
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

      {/* ✅ DETAILS MODAL (user friendly, scrollable, not washed out) */}
      <Dialog
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) {
            setSelectedUser(null);
            setDetailsPayload(null);
            setDetailsLoading(false);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden bg-white">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>

          <div className="max-h-[72vh] overflow-y-auto pr-1">
            {detailsLoading ? (
              <div className="py-6 text-sm text-muted-foreground">Loading user details...</div>
            ) : !detailsUser ? (
              <div className="py-6 text-sm text-muted-foreground">No details available.</div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-md border p-4">
                  <div className="text-base font-semibold">{val(detailsUser.name)}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {val(detailsUser.role)} • Joined {fmtDate(detailsUser.createdAt)}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <InfoRow label="Email" value={detailsUser.email} />
                  <InfoRow label="Phone" value={detailsUser.phone} />
                  <InfoRow label="Country" value={detailsUser.countryCode} />
                  <InfoRow label="Last Login" value={fmtDate(detailsUser.lastLoginAt)} />
                </div>

                <div className="rounded-md border p-4">
                  <div className="font-semibold mb-2">Account Status</div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <InfoRow label="Verified" value={prettyBool(detailsUser.isVerified)} />
                    <InfoRow label="Blocked" value={prettyBool(detailsUser.isBlocked)} />
                    <InfoRow
                      label="Suspended"
                      value={prettyBool(detailsUser.accountStatus?.isSuspended)}
                    />
                    <InfoRow label="Banned" value={prettyBool(detailsUser.accountStatus?.isBanned)} />
                  </div>

                  {detailsUser.accountStatus?.suspendedReason ? (
                    <div className="mt-3 text-sm">
                      <span className="font-medium">Suspended reason:</span>{" "}
                      {val(detailsUser.accountStatus.suspendedReason)}
                    </div>
                  ) : null}

                  {detailsUser.accountStatus?.bannedReason ? (
                    <div className="mt-2 text-sm">
                      <span className="font-medium">Banned reason:</span> {val(detailsUser.accountStatus.bannedReason)}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-md border p-4">
                  <div className="font-semibold mb-2">Quick Actions</div>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const st = detailsUser.accountStatus || {};
                      const busy = actionLoadingId === detailsUser._id;

                      return (
                        <>
                          {!st.isSuspended ? (
                            <Button size="sm" disabled={busy} onClick={() => suspendUser(detailsUser._id)}>
                              {busy ? "..." : "Suspend"}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={busy}
                              onClick={() => unsuspendUser(detailsUser._id)}
                            >
                              {busy ? "..." : "Unsuspend"}
                            </Button>
                          )}

                          {!st.isBanned ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={busy}
                              onClick={() => banUser(detailsUser._id)}
                            >
                              {busy ? "..." : "Ban"}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={busy}
                              onClick={() => unbanUser(detailsUser._id)}
                            >
                              {busy ? "..." : "Unban"}
                            </Button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Tip: Use <b>Raw</b> only when troubleshooting with developers.
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ✅ RAW MODAL (scrollable + copy) */}
      <Dialog
        open={rawOpen}
        onOpenChange={(open) => {
          setRawOpen(open);
          if (!open) {
            setSelectedUser(null);
            setDetailsPayload(null);
            setDetailsLoading(false);
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden bg-white">
          <DialogHeader>
            <DialogTitle>Raw User Data</DialogTitle>
          </DialogHeader>

          <div className="max-h-[72vh] overflow-y-auto pr-1">
            {detailsLoading ? (
              <div className="py-6 text-sm text-muted-foreground">Loading raw data...</div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      try {
                        const text = JSON.stringify(detailsPayload || selectedUser, null, 2);
                        navigator.clipboard.writeText(text);
                        alert("Copied ✅");
                      } catch {
                        alert("Copy failed");
                      }
                    }}
                  >
                    Copy Raw
                  </Button>
                </div>

                <pre className="text-xs whitespace-pre-wrap break-words rounded-md border bg-muted/20 p-3">
                  {JSON.stringify(detailsPayload || selectedUser, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value === undefined || value === null || value === "" ? "—" : String(value)}</div>
    </div>
  );
}