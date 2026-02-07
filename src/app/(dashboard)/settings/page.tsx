"use client";

import { useState } from "react";
import { apiClient, apiPaths } from "@/lib/api-client";
import { Button, Card, SectionHeading } from "@/components/ui";
import { useToast } from "@/components/toast";

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const { pushToast } = useToast();

  const handleHealthCheck = async () => {
    setLoading(true);
    try {
      await apiClient.get(apiPaths.settings);
      pushToast("Backend health check succeeded.", "success");
    } catch {
      pushToast("Backend health check failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <SectionHeading
        title="Settings"
        description="Configuration and connectivity checks."
      />
      <Card className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">API Base URL</p>
          <p className="text-sm text-slate-500">
            {process.env.NEXT_PUBLIC_API_URL ?? "Not configured"}
          </p>
        </div>
        <Button onClick={handleHealthCheck} disabled={loading}>
          {loading ? "Checking..." : "Run health check"}
        </Button>
      </Card>
    </div>
  );
}
