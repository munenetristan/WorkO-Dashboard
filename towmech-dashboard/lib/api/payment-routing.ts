// lib/api/payment-routing.ts
import api from "./axios";

export type PaymentProvider =
  | "PAYSTACK"
  | "MPESA"
  | "FLUTTERWAVE"
  | "PAYFAST"
  | "IKHOKHA"
  | "PEACH_PAYMENTS"
  | "MANUAL";

export type PaymentMethod =
  | "CARD"
  | "MOBILE_MONEY"
  | "BANK_TRANSFER"
  | "CASH"
  | "USSD";

export type PaymentRoutingConfig = {
  _id: string;

  countryCode: string; // ZA, KE, UG, etc
  currency: string; // ZAR, KES, UGX etc

  enabled: boolean;

  // which providers are enabled in this country
  providers: Array<{
    provider: PaymentProvider;
    enabled: boolean;

    // optional methods allowed for that provider
    methods?: PaymentMethod[];

    // optional priority (lower number = higher priority)
    priority?: number;
  }>;

  // default provider when client doesn't choose
  defaultProvider: PaymentProvider;

  // optional: enforce method/provider
  enforceProvider?: boolean;

  createdAt?: string;
  updatedAt?: string;
};

export type UpsertPaymentRoutingPayload = {
  countryCode: string;
  currency: string;

  enabled?: boolean;

  providers: Array<{
    provider: PaymentProvider;
    enabled: boolean;
    methods?: PaymentMethod[];
    priority?: number;
  }>;

  defaultProvider: PaymentProvider;

  enforceProvider?: boolean;
};

export async function getPaymentRoutingConfigs(params?: {
  countryCode?: string;
  enabled?: boolean;
}): Promise<PaymentRoutingConfig[]> {
  const res = await api.get("/api/admin/payment-routing", { params });
  return res.data?.configs || [];
}

export async function getPaymentRoutingConfig(countryCode: string): Promise<PaymentRoutingConfig | null> {
  const res = await api.get(`/api/admin/payment-routing/${countryCode}`);
  return res.data?.config || null;
}

export async function upsertPaymentRoutingConfig(
  payload: UpsertPaymentRoutingPayload
): Promise<PaymentRoutingConfig> {
  const res = await api.post("/api/admin/payment-routing", payload);
  return res.data?.config;
}

export async function updatePaymentRoutingConfig(
  id: string,
  payload: Partial<UpsertPaymentRoutingPayload>
): Promise<PaymentRoutingConfig> {
  const res = await api.patch(`/api/admin/payment-routing/${id}`, payload);
  return res.data?.config;
}

export async function setPaymentRoutingEnabled(
  id: string,
  enabled: boolean
): Promise<PaymentRoutingConfig> {
  const res = await api.patch(`/api/admin/payment-routing/${id}/enabled`, { enabled });
  return res.data?.config;
}

export async function deletePaymentRoutingConfig(id: string): Promise<{ ok: boolean }> {
  const res = await api.delete(`/api/admin/payment-routing/${id}`);
  return { ok: !!res.data?.ok };
}

/**
 * Public endpoint for app
 * returns routing rules for selected country
 */
export async function getPublicPaymentRouting(countryCode: string): Promise<PaymentRoutingConfig | null> {
  const res = await api.get("/api/config/payment-routing", { params: { countryCode } });
  return res.data?.config || null;
}