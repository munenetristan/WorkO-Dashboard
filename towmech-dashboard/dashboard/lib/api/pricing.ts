import api from "@/lib/api/axios";

export async function fetchPricingConfig() {
  const res = await api.get("/api/pricing-config");
  return res.data;
}

export async function updatePricingConfig(payload: any) {
  const res = await api.patch("/api/pricing-config", payload);
  return res.data;
}