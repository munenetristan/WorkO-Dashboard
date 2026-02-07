import api from "@/lib/api/axios";

export async function fetchAnalyticsSummary() {
  const res = await api.get("/api/admin/analytics/summary");
  return res.data;
}
