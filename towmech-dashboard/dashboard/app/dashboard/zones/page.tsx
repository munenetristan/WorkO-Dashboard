"use client";

import { useEffect, useMemo, useState } from "react";

import { ModuleHeader } from "@/components/dashboard/module-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useCountryStore } from "@/lib/store/countryStore";

import {
  fetchZones,
  createZone,
  updateZone,
  deleteZone,
} from "@/lib/api/zones";

type Zone = {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
};

export default function ZonesPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  // ✅ Create Zone Form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  // ✅ multi-country scope
  const { countryCode } = useCountryStore();

  const loadZones = async () => {
    if (!countryCode) {
      setZones([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchZones();
      setZones(data?.zones || []);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to load zones ❌");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadZones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryCode]);

  const filteredZones = useMemo(() => {
    if (!search) return zones;
    const s = search.toLowerCase();
    return zones.filter(
      (z) =>
        z.name.toLowerCase().includes(s) ||
        (z.description || "").toLowerCase().includes(s)
    );
  }, [zones, search]);

  const handleCreate = async () => {
    if (!countryCode) {
      alert("Select a country first ❌");
      return;
    }

    if (!name.trim()) {
      alert("Zone name is required ❌");
      return;
    }

    setCreating(true);
    try {
      await createZone({ name, description, isActive: true });
      alert("Zone created ✅");
      setName("");
      setDescription("");
      await loadZones();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to create zone ❌");
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (zone: Zone) => {
    if (!countryCode) {
      alert("Select a country first ❌");
      return;
    }

    try {
      await updateZone(zone._id, { isActive: !zone.isActive });
      await loadZones();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to update zone ❌");
    }
  };

  const handleDelete = async (id: string) => {
    if (!countryCode) {
      alert("Select a country first ❌");
      return;
    }

    if (!confirm("Delete this zone? This cannot be undone ❌")) return;

    try {
      await deleteZone(id);
      alert("Zone deleted ✅");
      await loadZones();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to delete zone ❌");
    }
  };

  const disabled = !countryCode;

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Zones Setup"
        description="Manage service regions, towns, suburbs and their availability."
      />

      {/* ✅ Create Zone */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add New Zone</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <Input
            placeholder={
              disabled ? "Select a country first..." : "Zone name (e.g Johannesburg CBD)"
            }
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={disabled}
          />

          <Input
            placeholder={disabled ? "Select a country first..." : "Optional description"}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={disabled}
          />

          <Button disabled={creating || disabled} onClick={handleCreate}>
            {creating ? "Creating..." : "Create Zone ✅"}
          </Button>
        </CardContent>
      </Card>

      {/* ✅ Zones Table */}
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-base">Zones</CardTitle>

          <Input
            className="max-w-sm"
            placeholder={disabled ? "Select a country to view zones..." : "Search zones..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={disabled}
          />
        </CardHeader>

        <CardContent>
          {disabled ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Select a country to view and manage zones.
            </div>
          ) : loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Loading zones...
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredZones.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-sm text-muted-foreground"
                      >
                        No zones found ✅
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredZones.map((z) => (
                      <TableRow key={z._id}>
                        <TableCell className="font-medium">{z.name}</TableCell>
                        <TableCell>{z.description || "—"}</TableCell>
                        <TableCell>
                          {z.isActive ? (
                            <Badge className="bg-green-600">ACTIVE</Badge>
                          ) : (
                            <Badge className="bg-slate-600">DISABLED</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={z.isActive}
                            onCheckedChange={() => handleToggle(z)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(z._id)}
                          >
                            Delete
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
    </div>
  );
}