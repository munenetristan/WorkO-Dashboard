// lib/api/countries.ts
import api from "./axios";

export type Country = {
  _id: string;
  code: string; // ZA, KE, UG etc
  name: string;

  currency: string; // ZAR, KES, UGX
  languages: string[]; // ["en", "sw"]
  defaultLanguage?: string;

  phoneRules?: {
    example?: string;
    regex?: string;
    countryDialCode?: string; // +27, +254
  };

  isActive: boolean;

  createdAt?: string;
  updatedAt?: string;
};

export type CreateCountryPayload = {
  code: string;
  name: string;
  currency?: string;
  languages?: string[];
  defaultLanguage?: string;
  isActive?: boolean;
  phoneRules?: {
    example?: string;
    regex?: string;
    countryDialCode?: string;
  };
};

export type UpdateCountryPayload = Partial<CreateCountryPayload>;

export async function getCountries(): Promise<Country[]> {
  const res = await api.get("/api/admin/countries");
  return res.data?.countries || [];
}

export async function getCountryByCode(code: string): Promise<Country | null> {
  const res = await api.get(`/api/admin/countries/${code}`);
  return res.data?.country || null;
}

export async function createCountry(payload: CreateCountryPayload): Promise<Country> {
  const res = await api.post("/api/admin/countries", payload);
  return res.data?.country;
}

export async function updateCountry(code: string, payload: UpdateCountryPayload): Promise<Country> {
  const res = await api.patch(`/api/admin/countries/${code}`, payload);
  return res.data?.country;
}

export async function deleteCountry(code: string): Promise<{ ok: boolean }> {
  const res = await api.delete(`/api/admin/countries/${code}`);
  return { ok: !!res.data?.ok };
}

export async function toggleCountryActive(code: string, isActive: boolean): Promise<Country> {
  const res = await api.patch(`/api/admin/countries/${code}/active`, { isActive });
  return res.data?.country;
}