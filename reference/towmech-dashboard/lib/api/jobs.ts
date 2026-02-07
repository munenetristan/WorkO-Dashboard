import api from "@/lib/api/axios";

export async function fetchAllJobs() {
  const res = await api.get("/api/admin/jobs");
  return res.data;
}

export async function fetchActiveJobs() {
  const res = await api.get("/api/admin/jobs/active");
  return res.data;
}

export async function fetchJobById(id: string) {
  const res = await api.get(`/api/admin/jobs/${id}`);
  return res.data;
}
