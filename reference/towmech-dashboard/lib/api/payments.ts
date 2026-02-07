// dashboard/lib/api/payments.ts
export type CountryCode = string;

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
    throw new Error((data as any)?.message || "Request failed");
  }
  return data;
}

/**
 * ✅ Customer Payments (Money IN)
 * Returns: { payments: [...] }
 *
 * NOTE:
 * - This endpoint name matches your old working page.
 * - If your backend expects countryCode, we pass it in query + header safely.
 */
export async function fetchAdminPayments(countryCode?: CountryCode) {
  const qs = new URLSearchParams();
  if (countryCode) qs.set("countryCode", countryCode);

  const res = await fetch(`${API_BASE}/api/admin/payments${qs.toString() ? `?${qs}` : ""}`, {
    method: "GET",
    headers: authHeaders(countryCode ? { "X-COUNTRY-CODE": countryCode } : {}),
  });

  return readJson(res) as Promise<{ payments: any[] }>;
}

/**
 * Backward compat:
 * Some newer code imports fetchPayments(countryCode) and expects an array.
 */
export async function fetchPayments(countryCode: CountryCode) {
  const data = await fetchAdminPayments(countryCode);
  return Array.isArray(data?.payments) ? data.payments : [];
}

/**
 * ✅ Manual refund (admin action)
 * Works with common backend patterns. If your route differs, adjust the URL once here.
 */
export async function refundPayment(paymentId: string, countryCode?: CountryCode) {
  if (!paymentId) throw new Error("paymentId is required");

  const res = await fetch(`${API_BASE}/api/admin/payments/${paymentId}/refund`, {
    method: "POST",
    headers: authHeaders(countryCode ? { "X-COUNTRY-CODE": countryCode } : {}),
  });

  return readJson(res);
}

/**
 * ✅ Manual mark paid (admin override)
 * Takes jobId because your old UI calls markPaymentPaid(jobId)
 * If your backend uses paymentId instead, change the URL + param usage here.
 */
export async function markPaymentPaid(jobId: string, countryCode?: CountryCode) {
  if (!jobId) throw new Error("jobId is required");

  const res = await fetch(`${API_BASE}/api/admin/payments/mark-paid/${jobId}`, {
    method: "POST",
    headers: authHeaders(countryCode ? { "X-COUNTRY-CODE": countryCode } : {}),
  });

  return readJson(res);
}

/**
 * =========================
 * Provider Owed (Money OUT)
 * =========================
 * computeProviderOwed is PURE (no network).
 * It expects a list of payments/jobs and computes totals owed to providers.
 */

function toYmd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseYmd(ymd?: string) {
  if (!ymd) return null;
  const dt = new Date(`${ymd}T00:00:00.000Z`);
  return Number.isFinite(dt.getTime()) ? dt : null;
}

function inRange(createdAtIso: string | undefined, fromYmd: string, toYmd: string) {
  if (!createdAtIso) return false;

  const from = parseYmd(fromYmd);
  const to = parseYmd(toYmd);
  if (!from || !to) return true;

  const t = new Date(createdAtIso);
  if (!Number.isFinite(t.getTime())) return false;

  // inclusive range: [from, to]
  const fromT = new Date(from);
  const toT = new Date(to);
  toT.setUTCDate(toT.getUTCDate() + 1); // make it inclusive by adding 1 day as exclusive end

  return t >= fromT && t < toT;
}

function getProviderId(p: any) {
  return (
    p?.providerId ||
    p?.provider?._id ||
    p?.provider?.id ||
    p?.job?.assignedTo?._id ||
    p?.job?.assignedTo?.id ||
    p?.job?.providerId ||
    p?.assignedTo ||
    null
  );
}

function getProviderName(p: any) {
  return (
    p?.providerName ||
    p?.provider?.name ||
    p?.job?.assignedTo?.name ||
    p?.provider ||
    null
  );
}

function getJobId(p: any) {
  return p?.job?._id || p?.jobId || p?.job || p?._id || "";
}

function getCreatedAt(p: any) {
  return p?.createdAt || p?.paidAt || p?.job?.createdAt || p?.job?.created_at || null;
}

function getPickup(p: any) {
  return p?.job?.pickupAddressText || p?.pickup || p?.job?.pickup || null;
}

function getDropoff(p: any) {
  return p?.job?.dropoffAddressText || p?.dropoff || p?.job?.dropoff || null;
}

function getProviderAmountDue(p: any) {
  // Try a bunch of common shapes:
  const v =
    p?.providerAmountDue ??
    p?.provider_due ??
    p?.amountDueToProvider ??
    p?.job?.pricing?.providerAmountDue ??
    p?.job?.providerAmountDue ??
    p?.job?.payoutAmount ??
    null;

  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function computeProviderOwed(args: {
  payments: any[];
  providerId?: string;
  fromYmd: string;
  toYmd: string;
}) {
  const payments = Array.isArray(args.payments) ? args.payments : [];
  const providerFilter = args.providerId?.trim() || null;

  const rows = payments
    .filter((p) => {
      const createdAt = getCreatedAt(p);
      if (!createdAt) return false;

      // Only consider items that actually have provider due
      const due = getProviderAmountDue(p);
      if (!due || due <= 0) return false;

      if (!inRange(String(createdAt), args.fromYmd, args.toYmd)) return false;

      const pid = String(getProviderId(p) || "");
      if (!pid) return false;

      if (providerFilter && pid !== providerFilter) return false;

      return true;
    })
    .map((p) => {
      const pid = String(getProviderId(p));
      const createdAt = String(getCreatedAt(p));
      return {
        jobId: String(getJobId(p)),
        createdAt,
        providerId: pid,
        providerName: getProviderName(p),
        pickup: getPickup(p),
        dropoff: getDropoff(p),
        providerAmountDue: getProviderAmountDue(p),
      };
    });

  const byProvider = new Map<
    string,
    { providerId: string; providerName: string | null; jobCount: number; totalDue: number }
  >();

  for (const r of rows) {
    const cur = byProvider.get(r.providerId) || {
      providerId: r.providerId,
      providerName: r.providerName || null,
      jobCount: 0,
      totalDue: 0,
    };
    cur.jobCount += 1;
    cur.totalDue += Number(r.providerAmountDue || 0) || 0;

    if (!cur.providerName && r.providerName) cur.providerName = r.providerName;

    byProvider.set(r.providerId, cur);
  }

  const providers = Array.from(byProvider.values()).sort((a, b) => b.totalDue - a.totalDue);
  const totalDueAll = providers.reduce((s, p) => s + (p.totalDue || 0), 0);

  return { rows, providers, totalDueAll };
}