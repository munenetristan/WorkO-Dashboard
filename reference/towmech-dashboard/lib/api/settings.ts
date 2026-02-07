import api from "@/lib/api/axios";

/**
 * ✅ Fetch system settings (Admin Dashboard)
 * GET /api/admin/settings
 */
export async function fetchSystemSettings() {
  const res = await api.get("/api/admin/settings");
  return res.data;
}

/**
 * ✅ Update system settings (Admin Dashboard)
 * PATCH /api/admin/settings
 */
export async function updateSystemSettings(payload: any) {
  const res = await api.patch("/api/admin/settings", payload);
  return res.data;
}

/**
 * ✅ Fetch Safe Integrations Config (Mobile App / Frontend Safe Use)
 * GET /api/config/integrations
 *
 * ✅ Returns ONLY safe keys:
 * - paymentGateway
 * - paymentPublicKey
 * - googleMapsKey
 *
 * ❌ Does not return secret keys
 */
export async function fetchSafeIntegrationsConfig() {
  const res = await api.get("/api/config/integrations");
  return res.data;
}