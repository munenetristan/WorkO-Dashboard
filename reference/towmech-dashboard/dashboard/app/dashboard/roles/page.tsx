"use client";

import { useEffect, useMemo, useState } from "react";

import { ModuleHeader } from "@/components/dashboard/module-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  fetchAdmins,
  createAdmin,
  updateAdminPermissions,
  archiveAdmin,
  suspendUser,
  unsuspendUser,
  banUser,
  unbanUser,
} from "@/lib/api/roles";

type AdminUser = {
  _id: string;
  name: string;
  email: string;
  role: string;

  permissions?: Record<string, boolean>;
  accountStatus?: {
    isSuspended?: boolean;
    isBanned?: boolean;
    isArchived?: boolean;
  };

  createdAt?: string;
};

const PERMISSION_KEYS = [
  // ✅ controls if admin can change Country workspace
  {
    key: "canSwitchCountryWorkspace",
    label: "Switch Country Workspace (Multi-country access)",
  },

  { key: "canViewOverview", label: "View Overview Dashboard" },

  // ✅ Support permission (so you can show/hide Support menu)
  { key: "canViewSupport", label: "View Support" },

  // ✅ Live Map permission (separate from Zones)
  { key: "canViewLiveMap", label: "View Live Map" },

  { key: "canVerifyProviders", label: "Verify Providers" },
  { key: "canApprovePayments", label: "Approve Payments" },
  { key: "canRefundPayments", label: "Refund Payments" },
  { key: "canManageUsers", label: "Manage Users" },
  { key: "canManageJobs", label: "Manage Jobs" },
  { key: "canBroadcastNotifications", label: "Broadcast Notifications" },
  { key: "canManageSafety", label: "Manage Safety Incidents" },
  { key: "canManageSettings", label: "Manage System Settings" },
  { key: "canManageZones", label: "Manage Zones" },
  { key: "canManageServiceCategories", label: "Manage Service Categories" },
  { key: "canViewAnalytics", label: "View Analytics" },
  { key: "canManagePricing", label: "Manage Pricing" },

  // ✅ other menu perms
  { key: "canManageChats", label: "Manage Chats" },
  { key: "canManageNotifications", label: "Manage Notifications" },
  { key: "canManageRoles", label: "Manage Roles & Permissions" },
  { key: "canManageCountries", label: "Manage Countries" },
  { key: "canManageCountryServices", label: "Manage Country Services" },
  { key: "canManagePaymentRouting", label: "Manage Payment Routing" },
  { key: "canManageLegal", label: "Manage Legal" },
  { key: "canManageInsurance", label: "Manage Insurance" },
];

export default function RolesPage() {
  const [tab, setTab] = useState<"admins" | "create">("admins");

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  // ✅ Permission Modal
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [permissionDraft, setPermissionDraft] = useState<Record<string, boolean>>(
    {}
  );
  const [savingPermissions, setSavingPermissions] = useState(false);

  // ✅ Create Admin Form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [role, setRole] = useState<"Admin" | "SuperAdmin">("Admin");
  const [createPermissions, setCreatePermissions] = useState<
    Record<string, boolean>
  >({});

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const data = await fetchAdmins();
      setAdmins(data?.admins || []);
    } catch (err) {
      alert("Failed to load admins ❌");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const filteredAdmins = useMemo(() => {
    if (!search) return admins;
    const s = search.toLowerCase();
    return admins.filter(
      (a) =>
        a.name.toLowerCase().includes(s) ||
        a.email.toLowerCase().includes(s) ||
        a.role.toLowerCase().includes(s)
    );
  }, [admins, search]);

  const getStatusBadge = (a: AdminUser) => {
    if (a.accountStatus?.isArchived)
      return <Badge className="bg-slate-700">ARCHIVED</Badge>;
    if (a.accountStatus?.isBanned)
      return <Badge className="bg-red-600">BANNED</Badge>;
    if (a.accountStatus?.isSuspended)
      return <Badge className="bg-orange-600">SUSPENDED</Badge>;
    return <Badge className="bg-green-600">ACTIVE</Badge>;
  };

  const openPermissionModal = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setPermissionDraft(admin.permissions || {});
  };

  const togglePermission = (
    key: string,
    stateSetter: any,
    current: Record<string, boolean>
  ) => {
    stateSetter({
      ...current,
      [key]: !current[key],
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedAdmin) return;

    setSavingPermissions(true);
    try {
      await updateAdminPermissions(selectedAdmin._id, permissionDraft);
      await loadAdmins();
      alert("Permissions updated ✅");
      setSelectedAdmin(null);
    } catch (err: any) {
      console.log("UPDATE PERMISSIONS ERROR:", err?.response?.data || err);
      alert(
        err?.message ||
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to update permissions ❌"
      );
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm("Are you sure you want to archive this admin?")) return;
    try {
      await archiveAdmin(id);
      await loadAdmins();
      alert("Admin archived ✅");
    } catch (err: any) {
      console.log("ARCHIVE ERROR:", err?.response?.data || err);
      alert(
        err?.message ||
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Archive failed ❌"
      );
    }
  };

  const handleCreateAdmin = async () => {
    if (!name || !email || !password || !phone) {
      alert("Name, email, phone and password are required ❌");
      return;
    }

    try {
      await createAdmin({
        name,
        email,
        phone,
        password,
        role,
        permissions: createPermissions,
      });

      alert("Admin created ✅");

      setName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setRole("Admin");
      setCreatePermissions({});
      setTab("admins");

      await loadAdmins();
    } catch (err: any) {
      console.log("CREATE ADMIN ERROR:", err);
      alert(err?.message || "Could not create admin ❌");
    }
  };

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Admin Roles & Permissions"
        description="Manage admin access levels, permissions, and audit controls."
      />

      {/* ✅ Tabs */}
      <div className="flex gap-2">
        <Button
          variant={tab === "admins" ? "default" : "outline"}
          onClick={() => setTab("admins")}
        >
          Admin Users
        </Button>
        <Button
          variant={tab === "create" ? "default" : "outline"}
          onClick={() => setTab("create")}
        >
          Create Admin
        </Button>
      </div>

      {/* ✅ TAB 1 — Admin Users */}
      {tab === "admins" && (
        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-base">Admin Accounts</CardTitle>
            <Input
              className="max-w-sm"
              placeholder="Search admin name, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Loading admins...
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredAdmins.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-8 text-sm text-muted-foreground"
                        >
                          No admin users found ✅
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAdmins.map((a) => (
                        <TableRow key={a._id}>
                          <TableCell className="font-medium">{a.name}</TableCell>
                          <TableCell>{a.email}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{a.role}</Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(a)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {
                              Object.keys(a.permissions || {}).filter(
                                (k) => a.permissions?.[k]
                              ).length
                            }{" "}
                            enabled
                          </TableCell>

                          <TableCell className="text-right space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openPermissionModal(a)}
                            >
                              Permissions
                            </Button>

                            {!a.accountStatus?.isSuspended ? (
                              <Button size="sm" onClick={() => suspendUser(a._id)}>
                                Suspend
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => unsuspendUser(a._id)}
                              >
                                Unsuspend
                              </Button>
                            )}

                            {!a.accountStatus?.isBanned ? (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => banUser(a._id)}
                              >
                                Ban
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => unbanUser(a._id)}
                              >
                                Unban
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleArchive(a._id)}
                            >
                              Archive
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ✅ TAB 2 — Create Admin */}
      {tab === "create" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create Admin Account</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <Input
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              placeholder="Phone (e.g. 071..., +27...)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
            >
              <option value="Admin">Admin</option>
              <option value="SuperAdmin">SuperAdmin</option>
            </select>

            <div className="rounded-md border p-4 space-y-2">
              <p className="text-sm font-medium">Permissions</p>

              {PERMISSION_KEYS.map((p) => (
                <label key={p.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!createPermissions[p.key]}
                    onChange={() =>
                      togglePermission(p.key, setCreatePermissions, createPermissions)
                    }
                  />
                  {p.label}
                </label>
              ))}
            </div>

            <Button className="w-full" onClick={handleCreateAdmin}>
              Create Admin
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ✅ Permission Modal */}
      <Dialog open={!!selectedAdmin} onOpenChange={() => setSelectedAdmin(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Permissions</DialogTitle>
          </DialogHeader>

          {selectedAdmin && (
            <div className="space-y-4 text-sm">
              <div>
                <strong>{selectedAdmin.name}</strong>
                <div className="text-xs text-muted-foreground">
                  {selectedAdmin.email}
                </div>
              </div>

              <div className="rounded-md border p-4 space-y-2">
                {PERMISSION_KEYS.map((p) => (
                  <label key={p.key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!permissionDraft[p.key]}
                      onChange={() =>
                        togglePermission(p.key, setPermissionDraft, permissionDraft)
                      }
                    />
                    {p.label}
                  </label>
                ))}
              </div>

              <Button
                className="w-full"
                disabled={savingPermissions}
                onClick={handleSavePermissions}
              >
                {savingPermissions ? "Saving..." : "Save Permissions"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}