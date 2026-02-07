"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient, apiPaths } from "@/lib/api-client";
import { extractItem } from "@/lib/api-utils";
import type { Job } from "@/lib/types";
import { Button, Card, SectionHeading } from "@/components/ui";
import { useToast } from "@/components/toast";

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { pushToast } = useToast();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const jobId = params.id as string;

  const loadJob = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(apiPaths.jobDetail(jobId));
      setJob(extractItem<Job>(response));
    } catch {
      pushToast("Unable to load job details.", "error");
    } finally {
      setLoading(false);
    }
  }, [jobId, pushToast]);

  useEffect(() => {
    loadJob();
  }, [loadJob]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-500">
        Loading job...
      </div>
    );
  }

  if (!job) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-500">
        Job not found.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <SectionHeading
          title={`Job ${job.id}`}
          description={`${job.serviceName} · ${job.status}`}
        />
        <Button variant="secondary" onClick={() => router.push("/jobs")}>
          Back to jobs
        </Button>
      </div>
      <Card className="space-y-4">
        <div className="grid gap-2 text-sm text-slate-600">
          <p>Customer: {job.customerName ?? "-"}</p>
          <p>Provider: {job.providerName ?? "-"}</p>
          <p>Country: {job.countryIso2 ?? "-"}</p>
          <p>Created: {job.createdAt}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Timeline</h3>
          <ol className="mt-3 space-y-3">
            {job.timeline?.length ? (
              job.timeline.map((event, index) => (
                <li
                  key={`${event.step}-${index}`}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {event.step}
                  </p>
                  <p className="text-xs text-slate-500">
                    {event.timestamp ?? "Timestamp unavailable"}
                  </p>
                  {event.note ? (
                    <p className="text-xs text-slate-500">{event.note}</p>
                  ) : null}
                </li>
              ))
            ) : (
              <p className="text-sm text-slate-500">No timeline events.</p>
            )}
          </ol>
        </div>
      </Card>
    </div>
  );
}
