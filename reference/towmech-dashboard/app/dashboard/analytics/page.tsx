"use client";

import { useEffect, useMemo, useState } from "react";
import { ModuleHeader } from "@/components/dashboard/module-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchAnalyticsSummary } from "@/lib/api/analytics";
import { JobStatusChart } from "@/components/dashboard/analytics/JobStatusChart";
import { useCountryStore } from "@/lib/store/countryStore";

type Country = {
  _id: string;
  code: string;
  name: string;
  currency: string;
  isActive: boolean;
};

type Analytics = {
  currency?: string;
  business: {
    revenue: {
      totalRevenue: number;
      revenueToday: number;
      revenueWeek: number;
      revenueMonth: number;
    };
    payments: {
      paymentsPaid: number;
      paymentsPending: number;
      paymentsRefunded: number;
    };
    jobs: {
      totalJobs: number;
      jobsToday: number;
      jobsWeek: number;
      jobsMonth: number;
      jobsCompleted: number;
      jobsCancelled: number;
    };
  };
  operations: {
    users: {
      totalCustomers: number;
      totalProviders: number;
    };
    providers: {
      onlineProviders: number;
      suspendedProviders: number;
      pendingVerificationProviders: number;
    };
    jobsByStatus: Record<string, number>;
    avgCompletionMinutes: number;
  };
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

function formatMoney(amount: number, currencyCode: string) {
  const n = Number(amount || 0) || 0;
  return `${n.toLocaleString()} ${currencyCode}`.trim();
}

export default function AnalyticsPage() {
  const { countryCode } = useCountryStore();

  const [countries, setCountries] = useState<Country[]>([]);
  const [data, setData] = useState<Analytics | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCountries = async () => {
    setLoadingCountries(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/countries`, {
        method: "GET",
        headers: authHeaders(),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to load countries");

      const list: Country[] = Array.isArray(json?.countries) ? json.countries : [];
      setCountries(list);
    } finally {
      setLoadingCountries(false);
    }
  };

  const loadAnalytics = async () => {
    if (!countryCode) {
      setLoading(false);
      setData(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetchAnalyticsSummary();
      setData(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load analytics");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCountries().catch(() => {
      // ignore here; currency can still fall back safely
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryCode]);

  const resolvedCurrency = useMemo(() => {
    // 1) Prefer Countries table currency for the selected workspace country
    const fromCountries = countries.find((c) => c.code === countryCode)?.currency;
    if (fromCountries) return fromCountries;

    // 2) If backend sends a currency, use it
    const fromBackend = (data as any)?.currency;
    if (typeof fromBackend === "string" && fromBackend.trim()) return fromBackend.trim();

    // 3) Last resort: empty (DON'T force ZAR)
    return "";
  }, [countries, countryCode, data]);

  if (!countryCode) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Select a country to view analytics.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Analytics & Reporting"
        description="Monitor business performance, job flow, and provider operations."
      />

      <div className="flex justify-end">
        <Button size="sm" onClick={loadAnalytics} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh Analytics"}
        </Button>
      </div>

      {(loading || loadingCountries) && (
        <div className="py-10 text-center text-sm text-muted-foreground">
          Loading analytics dashboard...
        </div>
      )}

      {error && <div className="py-10 text-center text-sm text-red-600">{error}</div>}

      {!loading && data && (
        <>
          {/* ✅ BUSINESS METRICS */}
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Business Metrics</CardTitle>
              {resolvedCurrency ? <Badge variant="secondary">{resolvedCurrency}</Badge> : null}
            </CardHeader>

            <CardContent className="grid gap-4 md:grid-cols-4">
              <Stat
                label="Total Revenue"
                value={formatMoney(data.business.revenue.totalRevenue, resolvedCurrency)}
              />
              <Stat
                label="Today Revenue"
                value={formatMoney(data.business.revenue.revenueToday, resolvedCurrency)}
              />
              <Stat
                label="Week Revenue"
                value={formatMoney(data.business.revenue.revenueWeek, resolvedCurrency)}
              />
              <Stat
                label="Month Revenue"
                value={formatMoney(data.business.revenue.revenueMonth, resolvedCurrency)}
              />
            </CardContent>
          </Card>

          {/* ✅ PAYMENTS */}
          <Card>
            <CardHeader>
              <CardTitle>Payments Overview</CardTitle>
            </CardHeader>

            <CardContent className="grid gap-4 md:grid-cols-3">
              <Stat label="Paid Payments" value={data.business.payments.paymentsPaid} />
              <Stat label="Pending Payments" value={data.business.payments.paymentsPending} />
              <Stat label="Refunded Payments" value={data.business.payments.paymentsRefunded} />
            </CardContent>
          </Card>

          {/* ✅ OPERATIONS */}
          <Card>
            <CardHeader>
              <CardTitle>Operational Overview</CardTitle>
            </CardHeader>

            <CardContent className="grid gap-4 md:grid-cols-4">
              <Stat label="Total Jobs" value={data.business.jobs.totalJobs} />
              <Stat label="Completed Jobs" value={data.business.jobs.jobsCompleted} />
              <Stat label="Cancelled Jobs" value={data.business.jobs.jobsCancelled} />
              <Stat label="Avg Completion" value={`${data.operations.avgCompletionMinutes} mins`} />
            </CardContent>
          </Card>

          {/* ✅ PROVIDER STATS */}
          <Card>
            <CardHeader>
              <CardTitle>Providers & Customers</CardTitle>
            </CardHeader>

            <CardContent className="grid gap-4 md:grid-cols-4">
              <Stat label="Total Customers" value={data.operations.users.totalCustomers} />
              <Stat label="Total Providers" value={data.operations.users.totalProviders} />
              <Stat label="Online Providers" value={data.operations.providers.onlineProviders} />
              <Stat
                label="Pending Provider Verification"
                value={data.operations.providers.pendingVerificationProviders}
              />
            </CardContent>
          </Card>

          {/* ✅ JOB STATUS CHART */}
          <Card>
            <CardHeader>
              <CardTitle>Jobs by Status</CardTitle>
            </CardHeader>

            <CardContent>
              <JobStatusChart jobsByStatus={data.operations.jobsByStatus} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

/**
 * ✅ Stat Component
 */
function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}