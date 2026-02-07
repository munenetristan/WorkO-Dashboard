import api from "@/lib/api/axios";

export async function fetchServiceCategories() {
  const res = await api.get("/api/admin/service-categories");
  return res.data;
}

export async function createServiceCategory(payload: any) {
  const res = await api.post("/api/admin/service-categories", payload);
  return res.data;
}

export async function updateServiceCategory(id: string, payload: any) {
  const res = await api.patch(`/api/admin/service-categories/${id}`, payload);
  return res.data;
}

export async function deleteServiceCategory(id: string) {
  const res = await api.delete(`/api/admin/service-categories/${id}`);
  return res.data;
}