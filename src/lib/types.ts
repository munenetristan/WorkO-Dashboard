export type AdminRole = "SUPER_ADMIN" | "ADMIN";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  enabled?: boolean;
};

export type Country = {
  id?: string;
  name: string;
  iso2: string;
  dialingCode: string;
  enabled: boolean;
};

export type Service = {
  id: string;
  name: string;
  genderTag: "M" | "W" | "B";
  sortOrder: number;
  enabled?: boolean;
};

export type PricingEntry = {
  id?: string;
  countryIso2: string;
  city: string;
  serviceId: string;
  serviceName?: string;
  fee: number;
};

export type Provider = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  countryIso2?: string;
  services?: string[];
  documents?: { id: string; name: string; url: string }[];
  cancellations?: number;
  suspensionReason?: string;
  suspensionEndsAt?: string;
};

export type Job = {
  id: string;
  serviceName: string;
  countryIso2?: string;
  status: string;
  createdAt: string;
  timeline?: { step: string; timestamp?: string; note?: string }[];
  customerName?: string;
  providerName?: string;
};
