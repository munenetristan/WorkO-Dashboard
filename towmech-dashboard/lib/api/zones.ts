import api from "@/lib/api/axios";

export async function fetchZones() {
  const res = await api.get("/api/admin/zones");
  return res.data;
}

export async function createZone(payload: {
  name: string;
  description?: string;
  isActive?: boolean;
}) {
  const res = await api.post("/api/admin/zones", payload);
  return res.data;
}

export async function updateZone(
  id: string,
  payload: {
    name?: string;
    description?: string;
    isActive?: boolean;
  }
) {
  const res = await api.patch(`/api/admin/zones/${id}`, payload);
  return res.data;
}

export async function deleteZone(id: string) {
  const res = await api.delete(`/api/admin/zones/${id}`);
  return res.data;
}