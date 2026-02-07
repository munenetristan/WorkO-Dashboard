"use client";

import { useEffect, useMemo, useState } from "react";
import { apiClient, apiPaths } from "@/lib/api-client";
import { extractList } from "@/lib/api-utils";
import type { Country, PricingEntry, Service } from "@/lib/types";
import { servicesCatalog } from "@/lib/services";
import {
  Button,
  Card,
  Input,
  Modal,
  SectionHeading,
  Select,
} from "@/components/ui";
import { useToast } from "@/components/toast";

const emptyEntry: PricingEntry = {
  countryIso2: "",
  city: "",
  serviceId: "",
  fee: 0,
};

export default function PricingPage() {
  const [entries, setEntries] = useState<PricingEntry[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [services, setServices] = useState<Service[]>(servicesCatalog);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<PricingEntry>(emptyEntry);
  const [loading, setLoading] = useState(true);
  const { pushToast } = useToast();

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const response = await apiClient.get(apiPaths.countries);
        const list = extractList<Country>(response);
        setCountries(list);
        setSelectedCountry(list[0]?.iso2 ?? "");
      } catch {
        pushToast("Unable to load countries.", "error");
      }
    };
    loadFilters();
  }, [pushToast]);

  useEffect(() => {
    const loadServices = async () => {
      if (!selectedCountry) {
        return;
      }
      try {
        const response = await apiClient.get(
          apiPaths.servicesByCountry(selectedCountry)
        );
        const list = extractList<Service>(response);
        if (list.length > 0) {
          setServices(list);
        }
      } catch {
        setServices(servicesCatalog);
      }
    };
    loadServices();
  }, [selectedCountry]);

  useEffect(() => {
    const loadPricing = async () => {
      if (!selectedCountry) {
        return;
      }
      setLoading(true);
      try {
        const response = await apiClient.get(
          apiPaths.pricingByCountry(selectedCountry)
        );
        setEntries(extractList<PricingEntry>(response));
      } catch {
        pushToast("Unable to load pricing.", "error");
      } finally {
        setLoading(false);
      }
    };
    loadPricing();
  }, [selectedCountry, pushToast]);

  const handleSave = async () => {
    if (!draft.countryIso2 || !draft.city || !draft.serviceId) {
      pushToast("Please fill all required fields.", "error");
      return;
    }
    try {
      await apiClient.post(apiPaths.pricing, draft);
      pushToast("Pricing entry created.", "success");
      setModalOpen(false);
      setDraft(emptyEntry);
      const response = await apiClient.get(
        apiPaths.pricingByCountry(selectedCountry)
      );
      setEntries(extractList<PricingEntry>(response));
    } catch {
      pushToast("Unable to create pricing.", "error");
    }
  };

  const filteredEntries = useMemo(() => {
    return entries.map((entry) => ({
      ...entry,
      serviceName:
        entry.serviceName ??
        services.find((service) => service.id === entry.serviceId)?.name,
    }));
  }, [entries, services]);

  return (
    <div className="space-y-8">
      <SectionHeading
        title="Pricing"
        description="Configure booking fees per city/location and service."
        action={<Button onClick={() => setModalOpen(true)}>New Entry</Button>}
      />
      <Card className="space-y-4">
        <Select
          label="Country"
          value={selectedCountry}
          onChange={(event) => setSelectedCountry(event.target.value)}
        >
          {countries.map((country) => (
            <option key={country.iso2} value={country.iso2}>
              {country.name}
            </option>
          ))}
        </Select>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="py-3">City</th>
                <th className="py-3">Service</th>
                <th className="py-3">Booking Fee</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-slate-500">
                    Loading pricing...
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-slate-500">
                    No pricing configured.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id ?? `${entry.city}-${entry.serviceId}`}>
                    <td className="border-t py-4 font-medium text-slate-900">
                      {entry.city}
                    </td>
                    <td className="border-t py-4 text-slate-600">
                      {entry.serviceName ?? entry.serviceId}
                    </td>
                    <td className="border-t py-4 text-slate-600">
                      {entry.fee}
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
        title="New pricing entry"
        description="Add booking fee for a city and service."
        onClose={() => {
          setModalOpen(false);
          setDraft(emptyEntry);
        }}
      >
        <div className="grid gap-4">
          <Select
            label="Country"
            value={draft.countryIso2}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                countryIso2: event.target.value,
              }))
            }
          >
            <option value="">Select a country</option>
            {countries.map((country) => (
              <option key={country.iso2} value={country.iso2}>
                {country.name}
              </option>
            ))}
          </Select>
          <Input
            label="City"
            value={draft.city}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, city: event.target.value }))
            }
          />
          <Select
            label="Service"
            value={draft.serviceId}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, serviceId: event.target.value }))
            }
          >
            <option value="">Select a service</option>
            {services
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
          </Select>
          <Input
            label="Booking fee"
            type="number"
            value={draft.fee}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                fee: Number(event.target.value),
              }))
            }
          />
          <Button onClick={handleSave}>Create entry</Button>
        </div>
      </Modal>
    </div>
  );
}
