"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiClient, apiPaths } from "@/lib/api-client";
import { extractList } from "@/lib/api-utils";
import type { Country, Job, Service } from "@/lib/types";
import { servicesCatalog } from "@/lib/services";
import {
  Badge,
  Card,
  Input,
  SectionHeading,
  Select,
} from "@/components/ui";
import { useToast } from "@/components/toast";

const statusTone = (status: string) => {
  if (["completed"].includes(status)) {
    return "green" as const;
  }
  if (["in_progress", "pending"].includes(status)) {
    return "yellow" as const;
  }
  if (["cancelled", "failed"].includes(status)) {
    return "red" as const;
  }
  return "slate" as const;
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [services, setServices] = useState<Service[]>(servicesCatalog);
  const [status, setStatus] = useState("all");
  const [country, setCountry] = useState("all");
  const [service, setService] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { pushToast } = useToast();

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const response = await apiClient.get(apiPaths.countries);
        setCountries(extractList<Country>(response));
      } catch {
        pushToast("Unable to load countries.", "error");
      }
    };
    loadFilters();
  }, [pushToast]);

  useEffect(() => {
    const loadJobs = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (status !== "all") params.set("status", status);
        if (country !== "all") params.set("country", country);
        if (service !== "all") params.set("service", service);
        const query = params.toString();
        const response = await apiClient.get(
          `${apiPaths.jobs}${query ? `?${query}` : ""}`
        );
        setJobs(extractList<Job>(response));
      } catch {
        pushToast("Unable to load jobs.", "error");
      } finally {
        setLoading(false);
      }
    };
    loadJobs();
  }, [status, country, service, pushToast]);

  const filtered = useMemo(() => {
    if (!search) {
      return jobs;
    }
    return jobs.filter((job) =>
      `${job.id} ${job.serviceName}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [jobs, search]);

  return (
    <div className="space-y-8">
      <SectionHeading
        title="Jobs"
        description="Monitor jobs with filters and timelines."
      />
      <Card className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <Select
            label="Status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
          <Select
            label="Country"
            value={country}
            onChange={(event) => setCountry(event.target.value)}
          >
            <option value="all">All</option>
            {countries.map((item) => (
              <option key={item.iso2} value={item.iso2}>
                {item.name}
              </option>
            ))}
          </Select>
          <Select
            label="Service"
            value={service}
            onChange={(event) => setService(event.target.value)}
          >
            <option value="all">All</option>
            {services.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
          <Input
            label="Search"
            placeholder="Search by job ID or service"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="py-3">Job</th>
                <th className="py-3">Service</th>
                <th className="py-3">Status</th>
                <th className="py-3">Created</th>
                <th className="py-3 text-right">View</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    Loading jobs...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    No jobs found.
                  </td>
                </tr>
              ) : (
                filtered.map((job) => (
                  <tr key={job.id} className="border-t">
                    <td className="py-4 font-medium text-slate-900">
                      {job.id}
                    </td>
                    <td className="py-4 text-slate-600">{job.serviceName}</td>
                    <td className="py-4">
                      <Badge tone={statusTone(job.status)}>{job.status}</Badge>
                    </td>
                    <td className="py-4 text-slate-600">{job.createdAt}</td>
                    <td className="py-4 text-right">
                      <Link
                        href={`/jobs/${job.id}`}
                        className="text-sm font-semibold text-slate-900"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
