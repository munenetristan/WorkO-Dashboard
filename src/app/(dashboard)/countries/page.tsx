"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient, apiPaths } from "@/lib/api-client";
import { extractList } from "@/lib/api-utils";
import type { Country } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  Input,
  Modal,
  SectionHeading,
  Toggle,
} from "@/components/ui";
import { useToast } from "@/components/toast";

const emptyCountry: Country = {
  name: "",
  iso2: "",
  dialingCode: "+",
  enabled: true,
};

export default function CountriesPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<Country>(emptyCountry);
  const { pushToast } = useToast();

  const loadCountries = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(apiPaths.countries);
      setCountries(extractList<Country>(response));
    } catch {
      pushToast("Unable to load countries.", "error");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    loadCountries();
  }, [loadCountries]);

  const filtered = useMemo(() => {
    if (!search) {
      return countries;
    }
    return countries.filter((country) =>
      `${country.name} ${country.iso2}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [countries, search]);

  const handleSave = async () => {
    if (draft.iso2.length !== 2) {
      pushToast("ISO2 must be exactly 2 characters.", "error");
      return;
    }
    if (!draft.dialingCode.startsWith("+")) {
      pushToast("Dialing code must start with +.", "error");
      return;
    }
    try {
      if (draft.id) {
        await apiClient.patch(apiPaths.countries + `/${draft.id}`, draft);
        pushToast("Country updated.", "success");
      } else {
        await apiClient.post(apiPaths.countries, draft);
        pushToast("Country created.", "success");
      }
      setModalOpen(false);
      setDraft(emptyCountry);
      await loadCountries();
    } catch {
      pushToast("Unable to save country.", "error");
    }
  };

  const toggleCountry = async (country: Country) => {
    try {
      await apiClient.patch(apiPaths.countries + `/${country.id}`, {
        enabled: !country.enabled,
      });
      setCountries((prev) =>
        prev.map((item) =>
          item.id === country.id ? { ...item, enabled: !item.enabled } : item
        )
      );
      pushToast("Country status updated.", "success");
    } catch {
      pushToast("Unable to update country.", "error");
    }
  };

  return (
    <div className="space-y-8">
      <SectionHeading
        title="Countries"
        description="Enable or disable countries available in the mobile app."
        action={<Button onClick={() => setModalOpen(true)}>Add Country</Button>}
      />
      <Card className="space-y-4">
        <Input
          placeholder="Search countries"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="py-3">Country</th>
                <th className="py-3">ISO2</th>
                <th className="py-3">Dialing</th>
                <th className="py-3">Status</th>
                <th className="py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    Loading countries...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    No countries found.
                  </td>
                </tr>
              ) : (
                filtered.map((country) => (
                  <tr key={country.id ?? country.iso2} className="border-t">
                    <td className="py-4 font-medium text-slate-900">
                      {country.name}
                    </td>
                    <td className="py-4 text-slate-600">{country.iso2}</td>
                    <td className="py-4 text-slate-600">
                      {country.dialingCode}
                    </td>
                    <td className="py-4">
                      <Badge tone={country.enabled ? "green" : "red"}>
                        {country.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setDraft(country);
                            setModalOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Toggle
                          enabled={country.enabled}
                          onClick={() => toggleCountry(country)}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <Modal
        open={modalOpen}
        title={draft.id ? "Edit Country" : "Add Country"}
        description="Provide ISO2 and dialing code to manage availability."
        onClose={() => {
          setModalOpen(false);
          setDraft(emptyCountry);
        }}
      >
        <div className="grid gap-4">
          <Input
            label="Country name"
            value={draft.name}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, name: event.target.value }))
            }
          />
          <Input
            label="ISO2"
            value={draft.iso2}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, iso2: event.target.value }))
            }
            maxLength={2}
          />
          <Input
            label="Dialing code"
            value={draft.dialingCode}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, dialingCode: event.target.value }))
            }
          />
          <Button onClick={handleSave}>{draft.id ? "Save" : "Create"}</Button>
        </div>
      </Modal>
    </div>
  );
}
