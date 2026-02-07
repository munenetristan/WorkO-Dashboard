"use client";

import { useEffect, useMemo, useState } from "react";

import { ModuleHeader } from "@/components/dashboard/module-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  broadcastNotification,
  fetchNotificationLogs,
  BroadcastPayload,
} from "@/lib/api/notifications";

type Log = {
  _id: string;
  title: string;
  body: string;
  audience: string;
  providerRole?: string;
  totalTargets: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  sentBy?: {
    name?: string;
    email?: string;
    role?: string;
  };
};

export default function NotificationsPage() {
  const [tab, setTab] = useState<"send" | "logs">("send");

  // ✅ Send state
  const [audience, setAudience] = useState<"ALL" | "CUSTOMERS" | "PROVIDERS">(
    "ALL"
  );
  const [providerRole, setProviderRole] = useState<
    "ALL" | "TOW_TRUCK" | "MECHANIC"
  >("ALL");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  // ✅ Logs state
  const [logs, setLogs] = useState<Log[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);

  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const data = await fetchNotificationLogs();
      setLogs(data?.logs || []);
    } catch (err) {
      alert("Failed to load notification logs ❌");
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "logs") loadLogs();
  }, [tab]);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      alert("Title and Message are required ❌");
      return;
    }

    setSending(true);
    try {
      const payload: BroadcastPayload = {
        audience,
        title,
        body,
        ...(audience === "PROVIDERS" ? { providerRole } : {}),
      };

      const res = await broadcastNotification(payload);

      alert(
        `Broadcast sent ✅\nTargets: ${res.stats.totalTargets}\nSuccess: ${res.stats.success}\nFailed: ${res.stats.failed}`
      );

      // reset
      setTitle("");
      setBody("");

      // reload logs if already in logs
      if (tab === "logs") loadLogs();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Broadcast failed ❌");
    } finally {
      setSending(false);
    }
  };

  const logsSummary = useMemo(() => {
    const total = logs.length;
    const success = logs.reduce((sum, l) => sum + (l.sentCount || 0), 0);
    const failed = logs.reduce((sum, l) => sum + (l.failedCount || 0), 0);
    return { total, success, failed };
  }, [logs]);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Notifications & Messaging"
        description="Send announcements to customers and providers, and track delivery logs."
      />

      {/* ✅ Tabs */}
      <div className="flex gap-2">
        <Button
          variant={tab === "send" ? "default" : "outline"}
          onClick={() => setTab("send")}
        >
          Send Notification
        </Button>
        <Button
          variant={tab === "logs" ? "default" : "outline"}
          onClick={() => setTab("logs")}
        >
          Notification Logs
        </Button>
      </div>

      {/* ✅ SEND TAB */}
      {tab === "send" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Broadcast Notification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Audience */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Audience
              </label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={audience}
                onChange={(e) =>
                  setAudience(e.target.value as "ALL" | "CUSTOMERS" | "PROVIDERS")
                }
              >
                <option value="ALL">All Users</option>
                <option value="CUSTOMERS">Customers Only</option>
                <option value="PROVIDERS">Providers Only</option>
              </select>
            </div>

            {/* Provider Role Filter */}
            {audience === "PROVIDERS" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Provider Type
                </label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={providerRole}
                  onChange={(e) =>
                    setProviderRole(
                      e.target.value as "ALL" | "TOW_TRUCK" | "MECHANIC"
                    )
                  }
                >
                  <option value="ALL">All Providers</option>
                  <option value="TOW_TRUCK">Tow Truck Only</option>
                  <option value="MECHANIC">Mechanic Only</option>
                </select>
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Title
              </label>
              <Input
                placeholder="Example: System Update"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Body */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Message
              </label>
              <textarea
                className="min-h-[120px] w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Write your notification message..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>

            {/* Send button */}
            <Button disabled={sending} onClick={handleSend} className="w-full">
              {sending ? "Sending..." : "Send Broadcast"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ✅ LOGS TAB */}
      {tab === "logs" && (
        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-base">
              Notification Logs
              <span className="ml-2 text-sm text-muted-foreground">
                ({logsSummary.total} broadcasts)
              </span>
            </CardTitle>

            <div className="flex gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">Success: {logsSummary.success}</Badge>
              <Badge variant="secondary">Failed: {logsSummary.failed}</Badge>
              <Button size="sm" variant="outline" onClick={loadLogs}>
                Refresh
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {logsLoading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Loading logs...
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Audience</TableHead>
                      <TableHead>Targets</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Failed</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {logs.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-8 text-sm text-muted-foreground"
                        >
                          No notification logs yet ✅
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log) => (
                        <TableRow key={log._id}>
                          <TableCell className="font-medium">
                            {log.title}
                            <div className="text-xs text-muted-foreground">
                              by {log.sentBy?.name || "—"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{log.audience}</Badge>
                            {log.audience === "PROVIDERS" && (
                              <div className="text-xs text-muted-foreground">
                                ({log.providerRole})
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{log.totalTargets}</TableCell>
                          <TableCell>
                            <Badge className="bg-green-600">{log.sentCount}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-red-600">{log.failedCount}</Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(log.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedLog(log)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ✅ View Log Modal */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Notification Log</DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-3 text-sm">
              <div>
                <strong>Title:</strong> {selectedLog.title}
              </div>
              <div>
                <strong>Message:</strong>
                <div className="mt-2 rounded-md border bg-slate-50 p-3">
                  {selectedLog.body}
                </div>
              </div>
              <div>
                <strong>Audience:</strong> {selectedLog.audience}
              </div>
              {selectedLog.audience === "PROVIDERS" && (
                <div>
                  <strong>Provider Role:</strong> {selectedLog.providerRole}
                </div>
              )}
              <div>
                <strong>Sent By:</strong>{" "}
                {selectedLog.sentBy?.name} ({selectedLog.sentBy?.email})
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Badge variant="secondary">
                  Targets: {selectedLog.totalTargets}
                </Badge>
                <Badge className="bg-green-600">
                  Sent: {selectedLog.sentCount}
                </Badge>
                <Badge className="bg-red-600">
                  Failed: {selectedLog.failedCount}
                </Badge>
              </div>

              <div className="text-xs text-muted-foreground">
                Created: {new Date(selectedLog.createdAt).toLocaleString()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
