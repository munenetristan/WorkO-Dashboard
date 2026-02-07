"use client";

import { useEffect, useMemo, useState } from "react";

import { ModuleHeader } from "@/components/dashboard/module-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  fetchAdminRatings,
  fetchAdminRatingById,
  RatingItem,
} from "@/lib/api/ratingsApi";

function StarsBadge({ value }: { value: number }) {
  const v = Math.max(1, Math.min(5, value || 0));
  const label = `${v}★`;
  if (v >= 4) return <Badge className="bg-green-600">{label}</Badge>;
  if (v === 3) return <Badge className="bg-yellow-600">{label}</Badge>;
  return <Badge className="bg-red-600">{label}</Badge>;
}

export default function SupportDisputesRatingsPage() {
  const [items, setItems] = useState<RatingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<any>(null);

  const [search, setSearch] = useState("");
  const [minStars, setMinStars] = useState<number | "">("");
  const [maxStars, setMaxStars] = useState<number | "">("");

  const [page, setPage] = useState(1);
  const limit = 20;

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminRatings({
        page,
        limit,
        search: search || "",
        minStars: minStars === "" ? undefined : Number(minStars),
        maxStars: maxStars === "" ? undefined : Number(maxStars),
      });

      // ✅ FIX: Some APIs return { ratings: [] } while others return { items: [] }
      const list = (data as any)?.ratings ?? (data as any)?.items ?? [];
      setItems(list || []);
    } catch {
      alert("Failed to load ratings ❌");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const filtered = useMemo(() => {
    // server already filters by stars/search when you press Search,
    // but keep UI safe if API returns broad results.
    let list = items;

    if (minStars !== "") list = list.filter((r) => (r.rating || 0) >= Number(minStars));
    if (maxStars !== "") list = list.filter((r) => (r.rating || 0) <= Number(maxStars));

    if (!search) return list;
    const s = search.toLowerCase();
    return list.filter((r) => {
      const raterName = (r.rater as any)?.name || "";
      const targetName = (r.target as any)?.name || "";
      const comment = r.comment || "";
      return (
        raterName.toLowerCase().includes(s) ||
        targetName.toLowerCase().includes(s) ||
        comment.toLowerCase().includes(s)
      );
    });
  }, [items, search, minStars, maxStars]);

  const openDetails = async (id: string) => {
    setSelectedId(id);
    setActionLoading(true);
    try {
      const data: any = await fetchAdminRatingById(id);

      // ✅ EXTRA SAFETY:
      // supports both shapes:
      // 1) RatingItem
      // 2) { rating: RatingItem }
      setSelected(data?.rating ?? data);
    } catch {
      alert("Failed to load rating details ❌");
      setSelectedId(null);
    } finally {
      setActionLoading(false);
    }
  };

  const closeDetails = () => {
    setSelectedId(null);
    setSelected(null);
  };

  const raterName = (r: RatingItem) => ((r.rater as any)?.name ? (r.rater as any).name : "—");
  const targetName = (r: RatingItem) => ((r.target as any)?.name ? (r.target as any).name : "—");
  const jobTitle = (r: RatingItem) =>
    typeof r.job === "object" ? (r.job?.title || r.job?._id || "—") : r.job || "—";

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Ratings"
        description="Monitor customer/provider ratings and comments."
      />

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-base">Ratings Inbox</CardTitle>

          <div className="flex flex-wrap gap-2">
            <Input
              className="w-64"
              placeholder="Search rater, target, comment..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="rounded-md border px-3 py-2 text-sm"
              value={minStars}
              onChange={(e) => setMinStars(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Min Stars</option>
              <option value="1">1★</option>
              <option value="2">2★</option>
              <option value="3">3★</option>
              <option value="4">4★</option>
              <option value="5">5★</option>
            </select>

            <select
              className="rounded-md border px-3 py-2 text-sm"
              value={maxStars}
              onChange={(e) => setMaxStars(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Max Stars</option>
              <option value="1">1★</option>
              <option value="2">2★</option>
              <option value="3">3★</option>
              <option value="4">4★</option>
              <option value="5">5★</option>
            </select>

            <Button
              variant="secondary"
              onClick={() => {
                setPage(1);
                load();
              }}
            >
              Search
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Loading ratings...
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stars</TableHead>
                    <TableHead>Rater</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                        No ratings found ✅
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((r) => (
                      <TableRow key={r._id}>
                        <TableCell>
                          <StarsBadge value={r.rating} />
                        </TableCell>
                        <TableCell className="font-medium">{raterName(r)}</TableCell>
                        <TableCell className="font-medium">{targetName(r)}</TableCell>
                        <TableCell className="max-w-[220px] truncate">{jobTitle(r)}</TableCell>
                        <TableCell className="max-w-[320px] truncate">
                          {r.comment?.trim() ? r.comment : <span className="text-muted-foreground">—</span>}
                        </TableCell>

                        {/* ✅ FIX: r.createdAt can be undefined */}
                        <TableCell>
                          {r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}
                        </TableCell>

                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionLoading && selectedId === r._id}
                            onClick={() => openDetails(r._id)}
                          >
                            {actionLoading && selectedId === r._id ? "..." : "View"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between p-3 text-sm">
                <div className="text-muted-foreground">Page {page}</div>
                <div className="space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Prev
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ✅ Details Modal */}
      <Dialog open={!!selectedId} onOpenChange={closeDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Rating Details</DialogTitle>
          </DialogHeader>

          {actionLoading ? (
            <div className="py-8 text-sm text-muted-foreground">Loading…</div>
          ) : selected ? (
            <div className="space-y-3 text-sm">
              <div>
                <strong>Stars:</strong>{" "}
                {typeof selected.rating === "number" ? selected.rating : (selected?.rating?.rating ?? "—")}★
              </div>
              <div>
                <strong>Comment:</strong>
                <div className="mt-2 rounded-md border bg-slate-50 p-3">
                  {selected.comment?.trim() ? selected.comment : "—"}
                </div>
              </div>
              <div>
                <strong>Rater:</strong>{" "}
                {selected.rater?.name || "—"}{" "}
                <span className="text-muted-foreground">
                  ({selected.rater?.email || "no email"})
                </span>
              </div>
              <div>
                <strong>Target:</strong>{" "}
                {selected.target?.name || "—"}{" "}
                <span className="text-muted-foreground">
                  ({selected.target?.email || "no email"})
                </span>
              </div>
              <div>
                <strong>Job:</strong> {selected.job?.title || selected.job?._id || "—"}
              </div>

              {/* ✅ FIX: selected.createdAt might be missing */}
              <div>
                <strong>Date:</strong>{" "}
                {selected.createdAt ? new Date(selected.createdAt).toLocaleString() : "—"}
              </div>
            </div>
          ) : (
            <div className="py-8 text-sm text-muted-foreground">No details.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}