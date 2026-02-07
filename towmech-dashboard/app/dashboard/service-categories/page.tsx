"use client";

import { useEffect, useMemo, useState } from "react";

import { ModuleHeader } from "@/components/dashboard/module-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

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
  fetchServiceCategories,
  createServiceCategory,
  updateServiceCategory,
  deleteServiceCategory,
} from "@/lib/api/serviceCategories";

import { useCountryStore } from "@/lib/store/countryStore";

type ServiceCategory = {
  _id: string;
  name: string;
  description?: string;
  providerType: "TOW_TRUCK" | "MECHANIC";
  active: boolean;
  createdAt?: string;
};

export default function ServiceCategoriesPage() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  // ✅ Create/Edit Modal
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<ServiceCategory | null>(null);

  // ✅ Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [providerType, setProviderType] = useState<"TOW_TRUCK" | "MECHANIC">(
    "TOW_TRUCK"
  );
  const [active, setActive] = useState(true);

  // ✅ multi-country scope
  const { countryCode } = useCountryStore();

  const loadCategories = async () => {
    if (!countryCode) {
      setCategories([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchServiceCategories();
      setCategories(data?.categories || []);
    } catch (err: any) {
      alert(
        err?.response?.data?.message || "Failed to load service categories ❌"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryCode]);

  const filtered = useMemo(() => {
    if (!search) return categories;
    const s = search.toLowerCase();
    return categories.filter((c) => {
      return (
        c.name.toLowerCase().includes(s) ||
        (c.description || "").toLowerCase().includes(s) ||
        c.providerType.toLowerCase().includes(s)
      );
    });
  }, [categories, search]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setProviderType("TOW_TRUCK");
    setActive(true);
    setEditing(null);
  };

  const openCreate = () => {
    if (!countryCode) {
      alert("Select a country first ❌");
      return;
    }
    resetForm();
    setOpenModal(true);
  };

  const openEdit = (cat: ServiceCategory) => {
    if (!countryCode) {
      alert("Select a country first ❌");
      return;
    }
    setEditing(cat);
    setName(cat.name);
    setDescription(cat.description || "");
    setProviderType(cat.providerType);
    setActive(!!cat.active);
    setOpenModal(true);
  };

  const handleSave = async () => {
    if (!countryCode) {
      alert("Select a country first ❌");
      return;
    }

    if (!name.trim()) {
      alert("Name is required ❌");
      return;
    }

    const payload = {
      name,
      description,
      providerType,
      active,
    };

    try {
      if (editing) {
        await updateServiceCategory(editing._id, payload);
        alert("Service category updated ✅");
      } else {
        await createServiceCategory(payload);
        alert("Service category created ✅");
      }

      await loadCategories();
      setOpenModal(false);
      resetForm();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Save failed ❌");
    }
  };

  const handleDelete = async (id: string) => {
    if (!countryCode) {
      alert("Select a country first ❌");
      return;
    }

    if (!confirm("Are you sure you want to delete this service category?"))
      return;

    try {
      await deleteServiceCategory(id);
      alert("Service category deleted ✅");
      await loadCategories();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Delete failed ❌");
    }
  };

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Service Categories"
        description="Create and manage Tow Truck and Mechanic service categories."
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input
          className="max-w-sm"
          placeholder={
            countryCode
              ? "Search service categories..."
              : "Select a country to view categories..."
          }
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={!countryCode}
        />

        <Button onClick={openCreate} disabled={!countryCode}>
          + Add Service Category
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Service Categories List</CardTitle>
        </CardHeader>

        <CardContent>
          {!countryCode ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Select a country to view and manage categories.
            </div>
          ) : loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Loading service categories...
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Provider Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8 text-sm text-muted-foreground"
                      >
                        No service categories found ✅
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((c) => (
                      <TableRow key={c._id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {c.description || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {c.providerType === "TOW_TRUCK"
                              ? "TowTruck"
                              : "Mechanic"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {c.active ? (
                            <Badge className="bg-green-600">ACTIVE</Badge>
                          ) : (
                            <Badge className="bg-slate-500">INACTIVE</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {c.createdAt
                            ? new Date(c.createdAt).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(c)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(c._id)}
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

      {/* ✅ MODAL */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Service Category" : "Create Service Category"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder="Service Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <Input
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div className="space-y-2">
              <p className="text-sm font-medium">Provider Type</p>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={providerType}
                onChange={(e) => setProviderType(e.target.value as any)}
              >
                <option value="TOW_TRUCK">TowTruck</option>
                <option value="MECHANIC">Mechanic</option>
              </select>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">
                  If inactive, it won’t be selectable in mobile app.
                </p>
              </div>
              <Switch checked={active} onCheckedChange={(v) => setActive(v)} />
            </div>

            <Button className="w-full" onClick={handleSave}>
              {editing ? "Save Changes ✅" : "Create Category ✅"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}