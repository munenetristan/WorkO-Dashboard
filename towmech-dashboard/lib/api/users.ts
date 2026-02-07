import api from "@/lib/api/axios";

export async function fetchUsers() {
  const res = await api.get("/api/admin/users");
  return res.data;
}

export async function fetchUserById(id: string) {
  const res = await api.get(`/api/admin/users/${id}`);
  return res.data;
}
