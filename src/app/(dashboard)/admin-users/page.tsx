"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient, apiPaths } from "@/lib/api-client";
import { extractList } from "@/lib/api-utils";
import type { AdminUser } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  Input,
  Modal,
  SectionHeading,
  Select,
} from "@/components/ui";
import { useToast } from "@/components/toast";
import { useAuth } from "@/components/auth-provider";

const emptyAdmin: AdminUser = {
  id: "",
  name: "",
  email: "",
  role: "ADMIN",
};

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<AdminUser>(emptyAdmin);
  const { pushToast } = useToast();

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(apiPaths.adminUsers);
      setAdmins(extractList<AdminUser>(response));
    } catch {
      pushToast("Unable to load admins.", "error");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  const handleCreate = async () => {
    if (!draft.name || !draft.email) {
      pushToast("Name and email are required.", "error");
      return;
    }
    try {
      await apiClient.post(apiPaths.adminUsers, {
        name: draft.name,
        email: draft.email,
        role: draft.role,
      });
      pushToast("Admin created.", "success");
      setModalOpen(false);
      setDraft(emptyAdmin);
      await loadAdmins();
    } catch {
      pushToast("Unable to create admin.", "error");
    }
  };

  const toggleAdmin = async (admin: AdminUser) => {
    try {
      await apiClient.patch(`${apiPaths.adminUsers}/${admin.id}`, {
        enabled: !admin.enabled,
      });
      setAdmins((prev) =>
        prev.map((item) =>
          item.id === admin.id
            ? { ...item, enabled: !item.enabled }
            : item
        )
      );
      pushToast("Admin updated.", "success");
    } catch {
      pushToast("Unable to update admin.", "error");
    }
  };

  if (user?.role !== "SUPER_ADMIN") {
    return (
      <Card>
        <SectionHeading
          title="Admin management"
          description="Only SUPER_ADMIN accounts can manage admin users."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <SectionHeading
        title="Admin Users"
        description="Create and manage admin accounts."
        action={<Button onClick={() => setModalOpen(true)}>New Admin</Button>}
      />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="py-3">Name</th>
                <th className="py-3">Email</th>
                <th className="py-3">Role</th>
                <th className="py-3">Status</th>
                <th className="py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    Loading admins...
                  </td>
                </tr>
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    No admins found.
                  </td>
                </tr>
              ) : (
                admins.map((admin) => (
                  <tr key={admin.id} className="border-t">
                    <td className="py-4 font-medium text-slate-900">
                      {admin.name}
                    </td>
                    <td className="py-4 text-slate-600">{admin.email}</td>
                    <td className="py-4">
                      <Badge tone={admin.role === "SUPER_ADMIN" ? "purple" : "blue"}>
                        {admin.role}
                      </Badge>
                    </td>
                    <td className="py-4">
                      <Badge tone={admin.enabled ? "green" : "red"}>
                        {admin.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </td>
                    <td className="py-4 text-right">
                      <Button
                        variant="ghost"
                        onClick={() => toggleAdmin(admin)}
                      >
                        {admin.enabled ? "Disable" : "Enable"}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <Modal
        open={modalOpen}
        title="Create admin"
        description="Invite a new admin to the WorkO dashboard."
        onClose={() => {
          setModalOpen(false);
          setDraft(emptyAdmin);
        }}
      >
        <div className="grid gap-4">
          <Input
            label="Full name"
            value={draft.name}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, name: event.target.value }))
            }
          />
          <Input
            label="Email"
            value={draft.email}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, email: event.target.value }))
            }
          />
          <Select
            label="Role"
            value={draft.role}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                role: event.target.value as AdminUser["role"],
              }))
            }
          >
            <option value="ADMIN">ADMIN</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
          </Select>
          <Button onClick={handleCreate}>Create admin</Button>
        </div>
      </Modal>
    </div>
  );
}
