"use client";

import { useEffect, useMemo, useState } from "react";

import { ModuleHeader } from "@/components/dashboard/module-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  fetchAdminChatThreads,
  fetchAdminChatMessages,
  AdminChatThread,
  AdminChatMessage,
} from "@/lib/api/chatApi";

export default function AdminChatsPage() {
  const [threads, setThreads] = useState<AdminChatThread[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedThread, setSelectedThread] = useState<AdminChatThread | null>(
    null
  );
  const [messages, setMessages] = useState<AdminChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const [search, setSearch] = useState("");

  const loadThreads = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminChatThreads();
      setThreads(data?.threads || []);
    } catch {
      alert("Failed to load chats ❌");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadThreads();
  }, []);

  const openThread = async (t: AdminChatThread) => {
    setSelectedThread(t);
    setMessages([]);
    setMessagesLoading(true);

    try {
      const data = await fetchAdminChatMessages(t._id);
      // ✅ backend returns { items: [...] }
      setMessages((data as any)?.items || (data as any)?.messages || []);
    } catch {
      alert("Failed to load chat messages ❌");
    } finally {
      setMessagesLoading(false);
    }
  };

  const close = () => {
    setSelectedThread(null);
    setMessages([]);
  };

  const filteredThreads = useMemo(() => {
    if (!search.trim()) return threads;
    const s = search.toLowerCase();

    return threads.filter((t) => {
      const job = t.job?.title || t.job?._id || "";
      const customer = t.customer?.name || "";
      const provider = t.provider?.name || "";
      return (
        job.toLowerCase().includes(s) ||
        customer.toLowerCase().includes(s) ||
        provider.toLowerCase().includes(s)
      );
    });
  }, [threads, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Chats (Admin)"
        description="Read live and historical job chats."
      />

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-base">Chat Threads</CardTitle>

          <div className="flex flex-wrap gap-2">
            <Input
              className="w-64"
              placeholder="Search job / customer / provider..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button variant="secondary" onClick={loadThreads}>
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Loading chats...
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Last Msg</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredThreads.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No chat threads found ✅
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredThreads.map((t) => (
                      <TableRow key={t._id}>
                        <TableCell>
                          {t.status === "ACTIVE" ? (
                            <Badge className="bg-green-600">ACTIVE</Badge>
                          ) : (
                            <Badge className="bg-slate-500">CLOSED</Badge>
                          )}
                        </TableCell>

                        <TableCell className="max-w-[220px] truncate">
                          {t.job?.title || t.job?._id || "—"}
                        </TableCell>

                        <TableCell>{t.customer?.name || "—"}</TableCell>
                        <TableCell>{t.provider?.name || "—"}</TableCell>

                        <TableCell>
                          {t.lastMessageAt
                            ? new Date(t.lastMessageAt).toLocaleString()
                            : "—"}
                        </TableCell>

                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openThread(t)}
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

      {/* ✅ Messages Modal */}
      <Dialog open={!!selectedThread} onOpenChange={close}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Chat Messages</DialogTitle>
          </DialogHeader>

          {messagesLoading ? (
            <div className="py-8 text-sm text-muted-foreground">Loading…</div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Job:{" "}
                <strong>
                  {selectedThread?.job?.title ||
                    selectedThread?.job?._id ||
                    "—"}
                </strong>
              </div>

              <div className="max-h-[450px] overflow-auto rounded-md border p-3 space-y-2">
                {messages.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No messages.
                  </div>
                ) : (
                  messages.map((m) => (
                    <div key={m._id} className="rounded-md border p-2 text-sm">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">
                          {m.sender?.name || "Unknown"}{" "}
                          <span className="text-muted-foreground">
                            ({m.senderRole || "—"})
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {m.createdAt
                            ? new Date(m.createdAt).toLocaleString()
                            : "—"}
                        </div>
                      </div>

                      {/* ✅ backend uses "text" */}
                      <div className="mt-1 whitespace-pre-wrap">{m.text || ""}</div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  onClick={() => selectedThread && openThread(selectedThread)}
                >
                  Refresh Messages
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}