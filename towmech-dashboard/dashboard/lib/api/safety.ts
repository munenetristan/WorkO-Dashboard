import api from "@/lib/api/axios";

export async function fetchSafetyIncidents() {
  const res = await api.get("/api/admin/safety/incidents");
  return res.data;
}

export async function resolveIncident(id: string) {
  const res = await api.patch(`/api/admin/safety/incidents/${id}/resolve`);
  return res.data;
}

export async function addIncidentNote(id: string, note: string) {
  const res = await api.patch(`/api/admin/safety/incidents/${id}/note`, { note });
  return res.data;
}
