"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiClient, apiPaths } from "@/lib/api-client";
import { extractList } from "@/lib/api-utils";
import type { Provider } from "@/lib/types";
import {
  Badge,
  Card,
  Input,
  SectionHeading,
  Select,
} from "@/components/ui";
import { useToast } from "@/components/toast";

const statusTone = (status: string) => {
  if (["approved", "active"].includes(status)) {
    return "green" as const;
  }
  if (["pending", "review"].includes(status)) {
    return "yellow" as const;
  }
  if (["banned", "rejected", "suspended"].includes(status)) {
    return "red" as const;
  }
  return "slate" as const;
};

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { pushToast } = useToast();

  useEffect(() => {
    const loadProviders = async () => {
      setLoading(true);
      try {
        const query = status === "all" ? "" : `?status=${status}`;
        const response = await apiClient.get(`${apiPaths.providers}${query}`);
        setProviders(extractList<Provider>(response));
      } catch {
        pushToast("Unable to load providers.", "error");
      } finally {
        setLoading(false);
      }
    };
    loadProviders();
  }, [status, pushToast]);

  const filtered = useMemo(() => {
    if (!search) {
      return providers;
    }
    return providers.filter((provider) =>
      `${provider.name} ${provider.email}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [providers, search]);

  return (
    <div className="space-y-8">
      <SectionHeading
        title="Providers"
        description="Verify providers and manage approval pipeline."
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
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="banned">Banned</option>
            <option value="suspended">Suspended</option>
            <option value="online">Online</option>
          </Select>
          <Input
            label="Search"
            placeholder="Search by name or email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="py-3">Provider</th>
                <th className="py-3">Email</th>
                <th className="py-3">Status</th>
                <th className="py-3">Country</th>
                <th className="py-3 text-right">View</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    Loading providers...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    No providers found.
                  </td>
                </tr>
              ) : (
                filtered.map((provider) => (
                  <tr key={provider.id} className="border-t">
                    <td className="py-4 font-medium text-slate-900">
                      {provider.name}
                    </td>
                    <td className="py-4 text-slate-600">{provider.email}</td>
                    <td className="py-4">
                      <Badge tone={statusTone(provider.status)}>
                        {provider.status}
                      </Badge>
                    </td>
                    <td className="py-4 text-slate-600">
                      {provider.countryIso2 ?? "-"}
                    </td>
                    <td className="py-4 text-right">
                      <Link
                        href={`/providers/${provider.id}`}
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
