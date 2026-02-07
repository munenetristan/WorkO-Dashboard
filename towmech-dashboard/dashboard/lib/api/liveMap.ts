import api from "@/lib/api/axios";

export async function fetchLiveProviders() {
  const res = await api.get("/api/admin/live/providers");
  return res.data;
}
