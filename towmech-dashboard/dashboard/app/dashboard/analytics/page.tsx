"use client";

import { useEffect, useState } from "react";
import { ModuleHeader } from "@/components/dashboard/module-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchAnalyticsSummary } from "@/lib/api/analytics";
import { JobStatusChart } from "@/components/dashboard/analytics/JobStatusChart";
import { useCountryStore } from "@/lib/store/countryStore";

type Analytics = {
  currency: string;
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

export default function AnalyticsPage() {
  const { countryCode } = useCountryStore();

  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryCode]);

  const currency = data?.currency || "ZAR";

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
        <Button size="sm" onClick={load} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh Analytics"}
        </Button>
      </div>

      {loading && (
        <div className="py-10 text-center text-sm text-muted-foreground">
          Loading analytics dashboard...
        </div>
      )}

      {error && (
        <div className="py-10 text-center text-sm text-red-600">{error}</div>
      )}

      {!loading && data && (
        <>
          {/* ✅ BUSINESS METRICS */}
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Business Metrics</CardTitle>
              <Badge variant="secondary">{currency}</Badge>
            </CardHeader>

            <CardContent className="grid gap-4 md:grid-cols-4">
              <Stat
                label="Total Revenue"
                value={`${data.business.revenue.totalRevenue} ${currency}`}
              />
              <Stat
                label="Today Revenue"
                value={`${data.business.revenue.revenueToday} ${currency}`}
              />
              <Stat
                label="Week Revenue"
                value={`${data.business.revenue.revenueWeek} ${currency}`}
              />
              <Stat
                label="Month Revenue"
                value={`${data.business.revenue.revenueMonth} ${currency}`}
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
              <Stat
                label="Pending Payments"
                value={data.business.payments.paymentsPending}
              />
              <Stat
                label="Refunded Payments"
                value={data.business.payments.paymentsRefunded}
              />
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
              <Stat
                label="Avg Completion"
                value={`${data.operations.avgCompletionMinutes} mins`}
              />
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