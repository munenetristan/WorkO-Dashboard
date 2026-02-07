// dashboard/lib/api/insurance.ts

export type CountryCode = string;

export type InsurancePartner = {
  _id: string;
  name: string;
  partnerCode?: string;
  email?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
  description?: string | null;
  countryCodes?: string[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type InsuranceCode = {
  _id: string;
  countryCode: string;
  code: string;
  isActive?: boolean;
  expiresAt?: string | null;
  usage?: {
    usedCount?: number;
    maxUses?: number;
    lastUsedAt?: string | null;
  };
  partner?: { _id?: string; name?: string; partnerCode?: string };
  createdAt?: string;
};

export type InvoiceItem = {
  jobId: string;
  shortId: string;
  createdAt: string;
  status: string;
  roleNeeded: string;
  pickupAddressText: string | null;
  dropoffAddressText: string | null;

  provider: null | {
    providerId: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  };

  customer: null | {
    customerId: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  };

  pricing: {
    currency: string;
    estimatedTotal: number;
    bookingFee: number;
    commissionAmount: number;
    providerAmountDue: number;
    estimatedDistanceKm: number;
  };

  insurance: {
    enabled: boolean;
    code: string | null;
    partnerId: string;
    validatedAt: string | null;
  };
};

export type InvoiceResponse = {
  partner: {
    partnerId: string;
    name: string;
    partnerCode: string;
    email: string | null;
    phone: string | null;
  };

  countryCode: string;
  currency: string;

  period: {
    month: string | null;
    from: string;
    to: string;
  };

  filters: {
    providerId: string | null;
  };

  // ✅ Match backend: invoiceService.js totals
  totals: {
    totalJobs: number;
    totalPartnerAmountDue: number;
    totalBookingFeeWaived: number;
    totalCommission: number;
    totalProviderAmountDue: number;
  };

  items: InvoiceItem[];

  groupedByProvider: Array<{
    providerId: string;
    name: string | null;
    email?: string | null;
    phone?: string | null;

    jobCount: number;

    // ✅ backend provides these fields
    grossTotal: number;
    commissionTotal: number;
    netTotalDue: number;

    currency: string;

    jobs?: Array<{
      jobId: string;
      shortId: string;
      createdAt: string;
      status: string;
      pickupAddressText: string | null;
      dropoffAddressText: string | null;
      estimatedTotal: number;
      commissionAmount: number;
      providerAmountDue: number;
      insuranceCode: string | null;
    }>;
  }>;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("adminToken") || localStorage.getItem("token");
}

function authHeaders(extra: Record<string, string> = {}) {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function readJson(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (data as any)?.message ||
      (data as any)?.error ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

async function readPdfOrThrow(res: Response) {
  const contentType = (res.headers.get("content-type") || "").toLowerCase();

  if (!res.ok) {
    // Try read json error
    if (contentType.includes("application/json")) {
      const data = await res.json().catch(() => ({}));
      const msg =
        (data as any)?.message ||
        (data as any)?.error ||
        `PDF request failed (${res.status})`;
      throw new Error(msg);
    }

    // Non-json error
    const text = await res.text().catch(() => "");
    throw new Error(text || `PDF request failed (${res.status})`);
  }

  if (!contentType.includes("application/pdf")) {
    // Sometimes reverse proxies return HTML; surface it
    const text = await res.text().catch(() => "");
    throw new Error(`Expected PDF but got "${contentType}". ${text ? `Response: ${text.slice(0, 180)}` : ""}`.trim());
  }

  return res.blob();
}

export async function getPartners(countryCode: CountryCode) {
  const res = await fetch(
    `${API_BASE}/api/admin/insurance/partners?countryCode=${encodeURIComponent(countryCode)}`,
    {
      method: "GET",
      headers: authHeaders({ "X-COUNTRY-CODE": countryCode }),
    }
  );
  const data = (await readJson(res)) as any;
  return (Array.isArray(data?.partners) ? data.partners : []) as InsurancePartner[];
}

export async function createPartner(countryCode: CountryCode, payload: any) {
  const res = await fetch(`${API_BASE}/api/admin/insurance/partners`, {
    method: "POST",
    headers: authHeaders({ "X-COUNTRY-CODE": countryCode }),
    body: JSON.stringify(payload),
  });
  return readJson(res);
}

export async function updatePartner(countryCode: CountryCode, partnerId: string, payload: any) {
  const res = await fetch(`${API_BASE}/api/admin/insurance/partners/${partnerId}`, {
    method: "PATCH",
    headers: authHeaders({ "X-COUNTRY-CODE": countryCode }),
    body: JSON.stringify(payload),
  });
  return readJson(res);
}

export async function getCodes(countryCode: CountryCode, partnerId: string) {
  const res = await fetch(
    `${API_BASE}/api/admin/insurance/codes?countryCode=${encodeURIComponent(
      countryCode
    )}&partnerId=${encodeURIComponent(partnerId)}`,
    {
      method: "GET",
      headers: authHeaders({ "X-COUNTRY-CODE": countryCode }),
    }
  );
  const data = (await readJson(res)) as any;
  return (Array.isArray(data?.codes) ? data.codes : []) as InsuranceCode[];
}

export async function generateCodes(countryCode: CountryCode, payload: any) {
  const res = await fetch(`${API_BASE}/api/admin/insurance/codes/generate`, {
    method: "POST",
    headers: authHeaders({ "X-COUNTRY-CODE": countryCode }),
    body: JSON.stringify(payload),
  });
  return readJson(res);
}

export async function disableCode(countryCode: CountryCode, codeId: string) {
  const res = await fetch(`${API_BASE}/api/admin/insurance/codes/${codeId}/disable`, {
    method: "PATCH",
    headers: authHeaders({ "X-COUNTRY-CODE": countryCode }),
  });
  return readJson(res);
}

export async function getInvoice(args: {
  countryCode: CountryCode;
  partnerId: string;
  month?: string;
  from?: string;
  to?: string;
  providerId?: string;
}) {
  const qs = new URLSearchParams();
  qs.set("countryCode", args.countryCode);
  qs.set("partnerId", args.partnerId);

  if (args.month) qs.set("month", args.month);
  if (args.from) qs.set("from", args.from);
  if (args.to) qs.set("to", args.to);
  if (args.providerId) qs.set("providerId", args.providerId);

  const res = await fetch(`${API_BASE}/api/admin/insurance/invoice?${qs.toString()}`, {
    method: "GET",
    headers: authHeaders({ "X-COUNTRY-CODE": args.countryCode }),
  });

  const data = (await readJson(res)) as any;
  return (data?.invoice || null) as InvoiceResponse | null;
}

// 1) Partner invoice PDF
export async function downloadInvoicePdf(args: {
  countryCode: CountryCode;
  partnerId: string;
  month?: string;
  from?: string;
  to?: string;
  providerId?: string;
}) {
  const qs = new URLSearchParams();
  qs.set("countryCode", args.countryCode);
  qs.set("partnerId", args.partnerId);

  if (args.month) qs.set("month", args.month);
  if (args.from) qs.set("from", args.from);
  if (args.to) qs.set("to", args.to);
  if (args.providerId) qs.set("providerId", args.providerId);

  const res = await fetch(`${API_BASE}/api/admin/insurance/invoice/pdf?${qs.toString()}`, {
    method: "GET",
    headers: (() => {
      const token = getToken();
      return {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "X-COUNTRY-CODE": args.countryCode,
      };
    })(),
  });

  return readPdfOrThrow(res);
}

// 2) Providers summary PDF (general statement)
export async function downloadProvidersSummaryPdf(args: {
  countryCode: CountryCode;
  partnerId: string;
  month?: string;
  from?: string;
  to?: string;
}) {
  const qs = new URLSearchParams();
  qs.set("countryCode", args.countryCode);
  qs.set("partnerId", args.partnerId);

  if (args.month) qs.set("month", args.month);
  if (args.from) qs.set("from", args.from);
  if (args.to) qs.set("to", args.to);

  const res = await fetch(`${API_BASE}/api/admin/insurance/providers/pdf?${qs.toString()}`, {
    method: "GET",
    headers: (() => {
      const token = getToken();
      return {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "X-COUNTRY-CODE": args.countryCode,
      };
    })(),
  });

  return readPdfOrThrow(res);
}

// 3) Provider statement PDF (individual statement)
export async function downloadProviderStatementPdf(args: {
  countryCode: CountryCode;
  partnerId: string;
  providerId: string;
  month?: string;
  from?: string;
  to?: string;
}) {
  const qs = new URLSearchParams();
  qs.set("countryCode", args.countryCode);
  qs.set("partnerId", args.partnerId);
  qs.set("providerId", args.providerId);

  if (args.month) qs.set("month", args.month);
  if (args.from) qs.set("from", args.from);
  if (args.to) qs.set("to", args.to);

  const res = await fetch(`${API_BASE}/api/admin/insurance/provider/pdf?${qs.toString()}`, {
    method: "GET",
    headers: (() => {
      const token = getToken();
      return {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "X-COUNTRY-CODE": args.countryCode,
      };
    })(),
  });

  return readPdfOrThrow(res);
}