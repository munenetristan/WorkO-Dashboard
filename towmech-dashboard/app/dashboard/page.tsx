"use client";

import { useEffect, useMemo, useState } from "react";
import { ModuleHeader } from "@/components/dashboard/module-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchOverviewSummary } from "@/lib/api/overview";
import { useCountryStore } from "@/lib/store/countryStore";

type Country = {
  _id: string;
  code: string;
  name: string;
  currency: string;
  isActive: boolean;
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

export default function DashboardOverviewPage() {
  const { countryCode } = useCountryStore();

  const [loading, setLoading] = useState(true);
  const [countries, setCountries] = useState<Country[]>([]);
  const [data, setData] = useState<any>(null);

  const loadCountries = async () => {
    const res = await fetch(`${API_BASE}/api/admin/countries`, {
      method: "GET",
      headers: authHeaders(),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || "Failed to load countries");

    const list: Country[] = Array.isArray(json?.countries) ? json.countries : [];
    setCountries(list);
  };

  const load = async () => {
    setLoading(true);
    try {
      await loadCountries().catch(() => {});
      const res = await fetchOverviewSummary();
      setData(res);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to load overview ❌");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryCode]);

  const resolvedCurrency = useMemo(() => {
    const fromCountries = countries.find((c) => c.code === countryCode)?.currency;
    if (fromCountries) return fromCountries;

    const fromBackend = data?.currency;
    if (typeof fromBackend === "string" && fromBackend.trim()) return fromBackend.trim();

    return "";
  }, [countries, countryCode, data]);

  if (!countryCode) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Select a country to view overview.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        Loading overview dashboard...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-10 text-center text-sm text-red-600">
        Failed to load overview data ❌
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Overview Dashboard"
        description="High-level platform performance and operational snapshot."
      />

      {/* ✅ Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Total Users" value={data.users} />
        <StatCard title="Total Providers" value={data.providers} />
        <StatCard title="Active Jobs" value={data.activeJobs} />
        <StatCard title="Pending Payments" value={data.pendingPayments} />
        <StatCard title="Open Support Tickets" value={data.openSupportTickets} />
        <StatCard title="Live Providers" value={data.liveProviders} />
        <StatCard
          title="Total Revenue"
          value={formatMoney(Number(data.revenueTotal || 0), resolvedCurrency)}
          badge={resolvedCurrency ? <Badge variant="secondary">{resolvedCurrency}</Badge> : undefined}
        />
      </div>

      {/* ✅ Most used services */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Most Used Services</CardTitle>
        </CardHeader>
        <CardContent>
          {data.topServices?.length === 0 ? (
            <p className="text-sm text-muted-foreground">No service records yet ✅</p>
          ) : (
            <div className="space-y-2">
              {data.topServices.map((s: any) => (
                <div
                  key={s.name}
                  className="flex items-center justify-between rounded-md border px-4 py-2"
                >
                  <p className="text-sm font-medium">{s.name}</p>
                  <Badge variant="secondary">{s.count}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  badge,
}: {
  title: string;
  value: any;
  badge?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
        {badge ? badge : null}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}