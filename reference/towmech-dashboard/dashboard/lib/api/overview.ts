import api from "./axios";

/**
 * Dashboard pages/components import: fetchOverviewSummary
 * ✅ Keep this export name to avoid breaking imports
 */
export async function fetchOverviewSummary() {
  // ✅ Backend routes are under /api
  const res = await api.get("/api/admin/overview/summary");
  return res.data;
}

/**
 * Optional alias (won’t break anything)
 */
export async function getOverviewSummary() {
  return fetchOverviewSummary();
}