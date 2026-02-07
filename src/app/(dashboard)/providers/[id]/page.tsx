"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient, apiPaths } from "@/lib/api-client";
import { extractItem } from "@/lib/api-utils";
import type { Provider } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  SectionHeading,
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

export default function ProviderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { pushToast } = useToast();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);

  const providerId = params.id as string;

  const loadProvider = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(apiPaths.providerDetail(providerId));
      setProvider(extractItem<Provider>(response));
    } catch {
      pushToast("Unable to load provider details.", "error");
    } finally {
      setLoading(false);
    }
  }, [providerId, pushToast]);

  useEffect(() => {
    loadProvider();
  }, [loadProvider]);

  const handleAction = async (action: string) => {
    try {
      await apiClient.post(apiPaths.providerAction(providerId, action));
      pushToast(`Provider ${action} updated.`, "success");
      await loadProvider();
    } catch {
      pushToast("Unable to update provider.", "error");
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-500">
        Loading provider...
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-500">
        Provider not found.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <SectionHeading
          title={provider.name}
          description={provider.email}
        />
        <Button variant="secondary" onClick={() => router.push("/providers")}>
          Back to providers
        </Button>
      </div>
      <Card className="space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <Badge tone={statusTone(provider.status)}>{provider.status}</Badge>
          <p className="text-sm text-slate-500">
            Country: {provider.countryIso2 ?? "-"}
          </p>
          <p className="text-sm text-slate-500">
            Phone: {provider.phone ?? "-"}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Services</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {provider.services?.length ? (
              provider.services.map((service) => (
                <Badge key={service} tone="blue">
                  {service}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-slate-500">No services listed.</p>
            )}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Documents</h3>
          <div className="mt-3 grid gap-2">
            {provider.documents?.length ? (
              provider.documents.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.url}
                  className="text-sm font-semibold text-slate-900 underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {doc.name}
                </a>
              ))
            ) : (
              <p className="text-sm text-slate-500">No documents uploaded.</p>
            )}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Button onClick={() => handleAction("approve")}>Approve</Button>
          <Button variant="danger" onClick={() => handleAction("reject")}>
            Reject
          </Button>
          <Button variant="secondary" onClick={() => handleAction("ban")}>
            Ban
          </Button>
          <Button variant="secondary" onClick={() => handleAction("unban")}>
            Unban
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleAction("suspend")}
          >
            Suspend
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleAction("unsuspend")}
          >
            Unsuspend
          </Button>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-700">
            Cancellations: {provider.cancellations ?? 0}
          </p>
          <p className="text-sm text-slate-700">
            Suspension reason: {provider.suspensionReason ?? "None"}
          </p>
          <p className="text-sm text-slate-700">
            Suspension ends: {provider.suspensionEndsAt ?? "-"}
          </p>
        </div>
      </Card>
    </div>
  );
}
