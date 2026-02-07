"use client";

import { useEffect, useMemo, useState } from "react";
import { apiClient, apiPaths } from "@/lib/api-client";
import { extractList } from "@/lib/api-utils";
import type { Country, Job, Provider } from "@/lib/types";
import { Card, SectionHeading, StatCard } from "@/components/ui";
import { useToast } from "@/components/toast";

export default function OverviewPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const { pushToast } = useToast();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [countryResponse, providerResponse, jobResponse] =
          await Promise.all([
            apiClient.get(apiPaths.countries),
            apiClient.get(apiPaths.providers),
            apiClient.get(apiPaths.jobs),
          ]);
        setCountries(extractList<Country>(countryResponse));
        setProviders(extractList<Provider>(providerResponse));
        setJobs(extractList<Job>(jobResponse));
      } catch {
        pushToast("Unable to load dashboard metrics.", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [pushToast]);

  const activeCountries = useMemo(
    () => countries.filter((country) => country.enabled).length,
    [countries]
  );
  const pendingProviders = useMemo(
    () => providers.filter((provider) => provider.status === "pending").length,
    [providers]
  );
  const activeJobs = useMemo(
    () => jobs.filter((job) => job.status === "active").length,
    [jobs]
  );

  return (
    <div className="space-y-8">
      <SectionHeading
        title="Overview"
        description="Key operational metrics for WorkO marketplace."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Active countries"
          value={loading ? "..." : `${activeCountries}`}
          delta="Enabled"
        />
        <StatCard
          label="Pending providers"
          value={loading ? "..." : `${pendingProviders}`}
          delta="Verification"
        />
        <StatCard
          label="Active jobs"
          value={loading ? "..." : `${activeJobs}`}
          delta="In progress"
        />
      </div>
      <Card>
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-semibold text-slate-900">
            Marketplace health
          </h3>
          <p className="text-sm text-slate-500">
            Monitor recent activity and confirm backend connectivity.
          </p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Countries
            </p>
            <p className="mt-2 text-sm text-slate-700">
              {loading ? "Loading..." : `${countries.length} total countries`}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Providers
            </p>
            <p className="mt-2 text-sm text-slate-700">
              {loading ? "Loading..." : `${providers.length} providers onboarded`}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Jobs
            </p>
            <p className="mt-2 text-sm text-slate-700">
              {loading ? "Loading..." : `${jobs.length} total jobs`}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
