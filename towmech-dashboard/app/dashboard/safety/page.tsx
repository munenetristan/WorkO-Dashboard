"use client";

import { useEffect, useMemo, useState } from "react";

import { ModuleHeader } from "@/components/dashboard/module-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Table,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
  TableBody,
} from "@/components/ui/table";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { fetchSafetyIncidents, resolveIncident } from "@/lib/api/safety";

type Incident = {
  _id: string;
  message: string;
  status: "OPEN" | "RESOLVED";
  location?: { lat: number; lng: number };
  triggeredRole?: string;
  triggeredBy?: {
    name?: string;
    email?: string;
    role?: string;
  };
  resolvedBy?: any;
  resolvedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export default function SafetyPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Incident | null>(null);

  const loadIncidents = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchSafetyIncidents();
      setIncidents(data?.incidents || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load safety incidents ❌");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  const filteredIncidents = useMemo(() => {
    if (!search) return incidents;
    const s = search.toLowerCase();
    return incidents.filter((i) => i.message?.toLowerCase().includes(s));
  }, [incidents, search]);

  const openMaps = (lat?: number, lng?: number) => {
    if (!lat || !lng) return;
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, "_blank");
  };

  const handleResolve = async (id: string) => {
    if (!confirm("Mark this incident as RESOLVED? ✅")) return;

    try {
      await resolveIncident(id);
      await loadIncidents();
      alert("Incident resolved ✅");
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to resolve incident ❌");
    }
  };

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Safety & Security Controls"
        description="Monitor and resolve emergency alerts and safety incidents."
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Total Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{incidents.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Open Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {incidents.filter((i) => i.status === "OPEN").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {incidents.filter((i) => i.status === "RESOLVED").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-base">Safety Incident Log</CardTitle>

          <Input
            className="max-w-sm"
            placeholder="Search incident message..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardHeader>

        <CardContent>
          {loading && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Loading safety incidents...
            </div>
          )}

          {error && (
            <div className="py-10 text-center text-sm text-red-600">{error}</div>
          )}

          {!loading && !error && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Message</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Triggered By</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredIncidents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                        No incidents found ✅
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredIncidents.map((incident) => (
                      <TableRow key={incident._id}>
                        <TableCell className="font-medium">{incident.message}</TableCell>

                        <TableCell>
                          {incident.status === "OPEN" ? (
                            <Badge className="bg-red-600">OPEN</Badge>
                          ) : (
                            <Badge className="bg-green-600">RESOLVED</Badge>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="text-sm font-medium">
                            {incident.triggeredBy?.name || "—"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {incident.triggeredRole || incident.triggeredBy?.role || "—"}
                          </div>
                        </TableCell>

                        <TableCell>
                          {incident.location ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                openMaps(
                                  incident.location?.lat,
                                  incident.location?.lng
                                )
                              }
                            >
                              View Map
                            </Button>
                          ) : (
                            "—"
                          )}
                        </TableCell>

                        <TableCell>
                          {incident.createdAt
                            ? new Date(incident.createdAt).toLocaleDateString()
                            : "—"}
                        </TableCell>

                        <TableCell className="text-right space-x-2">
                          <Button size="sm" variant="outline" onClick={() => setSelected(incident)}>
                            View
                          </Button>

                          {incident.status === "OPEN" && (
                            <Button size="sm" onClick={() => handleResolve(incident._id)}>
                              Resolve
                            </Button>
                          )}
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

      {/* ✅ VIEW MODAL */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Safety Incident Details</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-3 text-sm">
              <div>
                <strong>Message:</strong> {selected.message}
              </div>

              <div>
                <strong>Status:</strong>{" "}
                <Badge className={selected.status === "OPEN" ? "bg-red-600" : "bg-green-600"}>
                  {selected.status}
                </Badge>
              </div>

              <div>
                <strong>Triggered By:</strong>{" "}
                {selected.triggeredBy?.name} ({selected.triggeredRole})
              </div>

              <div>
                <strong>Email:</strong> {selected.triggeredBy?.email || "—"}
              </div>

              <div>
                <strong>Location:</strong>{" "}
                {selected.location ? `${selected.location.lat}, ${selected.location.lng}` : "—"}
              </div>

              <div>
                <strong>Created:</strong>{" "}
                {selected.createdAt ? new Date(selected.createdAt).toLocaleString() : "—"}
              </div>

              {selected.status === "OPEN" && (
                <Button className="w-full" onClick={() => handleResolve(selected._id)}>
                  Resolve Incident ✅
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
