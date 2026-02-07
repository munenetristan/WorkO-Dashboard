"use client";

import { useEffect, useState } from "react";
import { ModuleHeader } from "@/components/dashboard/module-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchOverviewSummary } from "@/lib/api/overview";

export default function DashboardOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchOverviewSummary();
      setData(res);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to load overview ❌");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

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
        <StatCard title="Total Revenue" value={`R ${data.revenueTotal}`} />
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

function StatCard({ title, value }: { title: string; value: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}