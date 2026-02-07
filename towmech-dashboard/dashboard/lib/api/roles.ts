// lib/api/roles.ts
import api from "@/lib/api/axios";

/**
 * Builds a safe path that works with either:
 *   baseURL = https://api.towmech.com
 * or
 *   baseURL = https://api.towmech.com/api
 *
 * If baseURL already ends with /api, we don't add it again.
 */
function withApiPrefix(path: string) {
  const base = (api.defaults.baseURL || "").replace(/\/$/, "");
  const alreadyHasApi = base.endsWith("/api") || base.includes("/api/");
  return `${alreadyHasApi ? "" : "/api"}${path.startsWith("/") ? "" : "/"}${path}`;
}

// ✅ Fetch all admin users (ADMIN + SUPERADMIN) (scoped by Country Workspace on backend)
export async function fetchAdmins() {
  try {
    const res = await api.get(withApiPrefix("/superadmin/admins"));
    return res.data;
  } catch (err: any) {
    throw new Error(
      err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to fetch admins ❌"
    );
  }
}

// ✅ Create admin (SuperAdmin only) (created into current Country Workspace)
export async function createAdmin(payload: {
  name: string;
  email: string;
  phone: string;
  password: string;
  role?: string;
  permissions?: Record<string, boolean>;
}) {
  try {
    const res = await api.post(withApiPrefix("/superadmin/create-admin"), payload);
    return res.data;
  } catch (err: any) {
    const message =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      "Could not create admin ❌";
    throw new Error(message);
  }
}

// ✅ Update permissions (SuperAdmin only)
export async function updateAdminPermissions(
  adminId: string,
  permissions: Record<string, boolean>
) {
  try {
    const res = await api.patch(withApiPrefix(`/superadmin/admin/${adminId}/permissions`), {
      permissions,
    });
    return res.data;
  } catch (err: any) {
    throw new Error(
      err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to update permissions ❌"
    );
  }
}

// ✅ Archive admin (SuperAdmin only)
export async function archiveAdmin(adminId: string) {
  try {
    const res = await api.patch(withApiPrefix(`/superadmin/admin/${adminId}/archive`), {});
    return res.data;
  } catch (err: any) {
    throw new Error(
      err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to archive admin ❌"
    );
  }
}

// ✅ Suspend / Unsuspend / Ban / Unban users via adminUsers routes
export async function suspendUser(userId: string) {
  try {
    const res = await api.patch(withApiPrefix(`/admin/users/${userId}/suspend`), {});
    return res.data;
  } catch (err: any) {
    throw new Error(
      err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Suspend failed ❌"
    );
  }
}

export async function unsuspendUser(userId: string) {
  try {
    const res = await api.patch(withApiPrefix(`/admin/users/${userId}/unsuspend`), {});
    return res.data;
  } catch (err: any) {
    throw new Error(
      err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Unsuspend failed ❌"
    );
  }
}

export async function banUser(userId: string) {
  try {
    const res = await api.patch(withApiPrefix(`/admin/users/${userId}/ban`), {});
    return res.data;
  } catch (err: any) {
    throw new Error(
      err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Ban failed ❌"
    );
  }
}

export async function unbanUser(userId: string) {
  try {
    const res = await api.patch(withApiPrefix(`/admin/users/${userId}/unban`), {});
    return res.data;
  } catch (err: any) {
    throw new Error(
      err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Unban failed ❌"
    );
  }
}