// lib/api/legal.ts
import api from "./axios";

export type LegalDocType = "TERMS" | "PRIVACY" | "REFUND" | "DISPUTE";

export type LegalDocument = {
  _id: string;

  countryCode: string; // ZA, KE, UG etc
  languageCode: string; // en, sw etc

  type: LegalDocType;
  title: string;
  content: string; // markdown or html text

  version: string; // e.g. "1.0"
  isActive: boolean;

  createdAt?: string;
  updatedAt?: string;
};

export type UpsertLegalDocumentPayload = {
  countryCode: string;
  languageCode: string;
  type: LegalDocType;

  title: string;
  content: string;

  version?: string;
  isActive?: boolean;
};

export async function getLegalDocuments(params?: {
  countryCode?: string;
  languageCode?: string;
  type?: LegalDocType;
  isActive?: boolean;
}): Promise<LegalDocument[]> {
  const res = await api.get("/api/admin/legal", { params });
  return res.data?.documents || [];
}

export async function getLegalDocumentById(id: string): Promise<LegalDocument | null> {
  const res = await api.get(`/api/admin/legal/${id}`);
  return res.data?.document || null;
}

export async function upsertLegalDocument(
  payload: UpsertLegalDocumentPayload
): Promise<LegalDocument> {
  const res = await api.post("/api/admin/legal", payload);
  return res.data?.document;
}

export async function updateLegalDocument(
  id: string,
  payload: Partial<UpsertLegalDocumentPayload>
): Promise<LegalDocument> {
  const res = await api.patch(`/api/admin/legal/${id}`, payload);
  return res.data?.document;
}

export async function setLegalDocumentActive(id: string, isActive: boolean): Promise<LegalDocument> {
  const res = await api.patch(`/api/admin/legal/${id}/active`, { isActive });
  return res.data?.document;
}

export async function deleteLegalDocument(id: string): Promise<{ ok: boolean }> {
  const res = await api.delete(`/api/admin/legal/${id}`);
  return { ok: !!res.data?.ok };
}

/**
 * Public (Mobile/Web) endpoint helpers
 * These hit backend public routes (NOT admin).
 */
export async function getPublicLegalDocument(params: {
  countryCode: string;
  languageCode: string;
  type: LegalDocType;
}): Promise<LegalDocument | null> {
  const res = await api.get("/api/legal", { params });
  return res.data?.document || null;
}