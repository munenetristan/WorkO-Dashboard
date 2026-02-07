// dashboard/lib/api/payments.ts

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

export type PaymentRow = any;

export async function fetchPayments(countryCode: string) {
  const res = await fetch(`${API_BASE}/api/admin/payments?countryCode=${encodeURIComponent(countryCode)}`, {
    method: "GET",
    headers: authHeaders({ "X-COUNTRY-CODE": countryCode }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Failed to load payments");

  return (Array.isArray(data?.payments) ? data.payments : []) as PaymentRow[];
}

function inRange(dateStr: string | null | undefined, from: Date, toExclusive: Date) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const t = d.getTime();
  return Number.isFinite(t) && t >= from.getTime() && t < toExclusive.getTime();
}

/**
 * Provider owed summary from Job.pricing.providerAmountDue
 * (This is not payment-status based; it's “what we owe providers”)
 */
export function computeProviderOwed(args: {
  payments: PaymentRow[];
  providerId?: string;
  fromYmd: string;
  toYmd: string;
}) {
  const from = new Date(`${args.fromYmd}T00:00:00.000Z`);
  const to = new Date(`${args.toYmd}T00:00:00.000Z`);
  to.setUTCDate(to.getUTCDate() + 1); // inclusive-to -> exclusive next day

  const rows: Array<{
    jobId: string;
    createdAt: string;
    providerId: string | null;
    providerName: string | null;
    pickup: string | null;
    dropoff: string | null;
    providerAmountDue: number;
    currency: string;
  }> = [];

  for (const p of args.payments) {
    const job = p?.job || null;
    if (!job) continue;

    // prefer job.createdAt, fallback payment.createdAt
    const createdAt = job?.createdAt || p?.createdAt;
    if (!inRange(createdAt, from, to)) continue;

    const provider = job?.assignedTo || null;
    const pid = provider?._id ? String(provider._id) : (job?.assignedTo ? String(job.assignedTo) : null);

    if (args.providerId && pid !== args.providerId) continue;

    const due = Number(job?.pricing?.providerAmountDue || 0) || 0;
    const currency = job?.pricing?.currency || "ZAR";

    rows.push({
      jobId: String(job?._id || ""),
      createdAt: new Date(createdAt).toISOString(),
      providerId: pid,
      providerName: provider?.name || null,
      pickup: job?.pickupAddressText || null,
      dropoff: job?.dropoffAddressText || null,
      providerAmountDue: due,
      currency,
    });
  }

  // group totals
  const byProvider = new Map<string, { providerId: string; providerName: string | null; jobCount: number; totalDue: number; currency: string }>();

  for (const r of rows) {
    if (!r.providerId) continue;
    const cur = byProvider.get(r.providerId) || {
      providerId: r.providerId,
      providerName: r.providerName,
      jobCount: 0,
      totalDue: 0,
      currency: r.currency,
    };
    cur.jobCount += 1;
    cur.totalDue += r.providerAmountDue;
    if (!cur.providerName && r.providerName) cur.providerName = r.providerName;
    byProvider.set(r.providerId, cur);
  }

  const providers = Array.from(byProvider.values()).sort((a, b) => (b.totalDue || 0) - (a.totalDue || 0));
  const totalDueAll = providers.reduce((sum, p) => sum + (p.totalDue || 0), 0);

  return { rows, providers, totalDueAll };
}