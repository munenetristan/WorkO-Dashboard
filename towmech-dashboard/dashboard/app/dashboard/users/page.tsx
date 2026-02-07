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

  accountStatus?: {
    isSuspended?: boolean;
    isBanned?: boolean;
    isArchived?: boolean;
  };
};

function withApiPrefix(path: string) {
  const base = (api.defaults.baseURL || "").replace(/\/$/, "");
  const alreadyHasApi = base.endsWith("/api") || base.includes("/api/");
  return `${alreadyHasApi ? "" : "/api"}${path.startsWith("/") ? "" : "/"}${path}`;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");

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
      setUsers(list);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to load users. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryCode]);

  const filteredUsers = useMemo(() => {
    if (!search) return users;
    const s = search.toLowerCase();
    return users.filter((u) => {
      return (
        (u.name || "").toLowerCase().includes(s) ||
        (u.email || "").toLowerCase().includes(s) ||
        (u.phone || "").toLowerCase().includes(s)
      );
    });
  }, [users, search]);

  const totalUsers = users.length;
  const verifiedUsers = users.filter((u) => u.isVerified).length;
  const blockedUsers = users.filter((u) => u.isBlocked).length;

  // ✅ Account actions
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

      {/* Search */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-base">Users</CardTitle>
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

                          <TableCell>
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                          </TableCell>

                          <TableCell className="text-right space-x-2">
                            {!st.isSuspended ? (
                              <Button size="sm" disabled={busy} onClick={() => suspendUser(u._id)}>
                                {busy ? "..." : "Suspend"}
                              </Button>
                            ) : (
                              <Button size="sm" variant="secondary" disabled={busy} onClick={() => unsuspendUser(u._id)}>
                                {busy ? "..." : "Unsuspend"}
                              </Button>
                            )}

                            {!st.isBanned ? (
                              <Button size="sm" variant="destructive" disabled={busy} onClick={() => banUser(u._id)}>
                                {busy ? "..." : "Ban"}
                              </Button>
                            ) : (
                              <Button size="sm" variant="secondary" disabled={busy} onClick={() => unbanUser(u._id)}>
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
    </div>
  );
}