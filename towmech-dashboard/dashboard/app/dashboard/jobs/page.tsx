"use client";

import { useEffect, useMemo, useState } from "react";

import { ModuleHeader } from "@/components/dashboard/module-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { fetchAllJobs, fetchJobById } from "@/lib/api/jobs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCountryStore } from "@/lib/store/countryStore";

type Job = {
  _id: string;
  status: string;
  roleNeeded?: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  distance?: number;
  estimatedFare?: number;
  createdAt?: string;

  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };

  assignedTo?: {
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
  };
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  // ✅ Modal state
  const [open, setOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  // ✅ country scoping (multi-country)
  const { countryCode } = useCountryStore();

  const loadJobs = async () => {
    if (!countryCode) {
      setJobs([]);
      setLoading(false);
      setError("Please select a country first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchAllJobs();
      setJobs(data?.jobs || data?.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryCode]);

  const filteredJobs = useMemo(() => {
    if (!search) return jobs;
    const s = search.toLowerCase();
    return jobs.filter((job) => {
      return (
        (job._id || "").toLowerCase().includes(s) ||
        (job.status || "").toLowerCase().includes(s) ||
        (job.roleNeeded || "").toLowerCase().includes(s) ||
        (job.customer?.name || "").toLowerCase().includes(s) ||
        (job.assignedTo?.name || "").toLowerCase().includes(s)
      );
    });
  }, [jobs, search]);

  const getStatusBadge = (status: string) => {
    const s = status?.toUpperCase();

    if (s === "COMPLETED") return <Badge className="bg-green-600">Completed</Badge>;
    if (s === "CANCELLED") return <Badge className="bg-red-600">Cancelled</Badge>;
    if (s === "IN_PROGRESS") return <Badge className="bg-blue-600">In Progress</Badge>;
    if (s === "ASSIGNED") return <Badge className="bg-indigo-600">Assigned</Badge>;
    if (s === "BROADCASTED") return <Badge className="bg-yellow-600">Broadcasted</Badge>;

    return <Badge variant="secondary">{status}</Badge>;
  };

  const openJobModal = async (jobId: string) => {
    setOpen(true);
    setSelectedJob(null);
    setDetailsError(null);
    setDetailsLoading(true);

    try {
      const data = await fetchJobById(jobId);
      setSelectedJob(data?.job || null);
    } catch (err: any) {
      setDetailsError(err?.response?.data?.message || "Failed to load job details");
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Trip & Job Management"
        description="Oversee all jobs, assignments, and execution in real-time."
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-base">All Jobs</CardTitle>
          <Input
            className="max-w-sm"
            placeholder="Search jobs, status, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardHeader>

        <CardContent>
          {loading && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Loading jobs...
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
                    <TableHead>Job ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Role Needed</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredJobs.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-sm text-muted-foreground"
                      >
                        No jobs found ✅
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredJobs.map((job) => (
                      <TableRow key={job._id}>
                        <TableCell className="font-medium">
                          {job._id?.slice?.(-8) || job._id}
                        </TableCell>
                        <TableCell>{getStatusBadge(job.status)}</TableCell>
                        <TableCell>{job.customer?.name || "—"}</TableCell>
                        <TableCell>{job.assignedTo?.name || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{job.roleNeeded || "—"}</Badge>
                        </TableCell>
                        <TableCell>
                          {job.createdAt ? new Date(job.createdAt).toLocaleString() : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openJobModal(job._id)}
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

      {/* ✅ View Job Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Job Details</DialogTitle>
          </DialogHeader>

          {detailsLoading && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Loading job details...
            </div>
          )}

          {detailsError && (
            <div className="py-10 text-center text-sm text-red-600">{detailsError}</div>
          )}

          {!detailsLoading && !detailsError && selectedJob && (
            <div className="space-y-6 text-sm">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-3 space-y-1">
                  <div className="font-medium">Job Info</div>
                  <div>
                    <b>ID:</b> {selectedJob._id}
                  </div>
                  <div>
                    <b>Status:</b> {selectedJob.status}
                  </div>
                  <div>
                    <b>Role Needed:</b> {selectedJob.roleNeeded}
                  </div>
                  <div>
                    <b>Distance:</b> {selectedJob.distance ?? "—"} km
                  </div>
                  <div>
                    <b>Estimated Fare:</b> {selectedJob.estimatedFare ?? "—"}
                  </div>
                </div>

                <div className="rounded-lg border p-3 space-y-1">
                  <div className="font-medium">Customer</div>
                  <div>
                    <b>Name:</b> {selectedJob.customer?.name || "—"}
                  </div>
                  <div>
                    <b>Email:</b> {selectedJob.customer?.email || "—"}
                  </div>
                  <div>
                    <b>Phone:</b> {selectedJob.customer?.phone || "—"}
                  </div>
                </div>

                <div className="rounded-lg border p-3 space-y-1">
                  <div className="font-medium">Assigned Provider</div>
                  <div>
                    <b>Name:</b> {selectedJob.assignedTo?.name || "—"}
                  </div>
                  <div>
                    <b>Email:</b> {selectedJob.assignedTo?.email || "—"}
                  </div>
                  <div>
                    <b>Phone:</b> {selectedJob.assignedTo?.phone || "—"}
                  </div>
                  <div>
                    <b>Role:</b> {selectedJob.assignedTo?.role || "—"}
                  </div>
                </div>

                <div className="rounded-lg border p-3 space-y-1">
                  <div className="font-medium">Locations</div>
                  <div>
                    <b>Pickup:</b> {selectedJob.pickupAddress || "—"}
                  </div>
                  <div>
                    <b>Dropoff:</b> {selectedJob.dropoffAddress || "—"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}