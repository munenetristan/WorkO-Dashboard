"use client";

import { useEffect, useMemo, useState } from "react";
import { apiClient, apiPaths } from "@/lib/api-client";
import { extractList } from "@/lib/api-utils";
import { servicesCatalog } from "@/lib/services";
import type { Country, Service } from "@/lib/types";
import {
  Badge,
  Card,
  Input,
  SectionHeading,
  Select,
  Toggle,
} from "@/components/ui";
import { useToast } from "@/components/toast";

export default function ServicesPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [services, setServices] = useState<Service[]>(servicesCatalog);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { pushToast } = useToast();

  useEffect(() => {
    const loadCountries = async () => {
      try {
        const response = await apiClient.get(apiPaths.countries);
        const list = extractList<Country>(response);
        setCountries(list);
        setSelectedCountry(list[0]?.iso2 ?? "");
      } catch {
        pushToast("Unable to load countries.", "error");
      }
    };
    loadCountries();
  }, [pushToast]);

  useEffect(() => {
    const loadServices = async () => {
      if (!selectedCountry) {
        return;
      }
      setLoading(true);
      try {
        const response = await apiClient.get(
          apiPaths.servicesByCountry(selectedCountry)
        );
        const list = extractList<Service>(response);
        if (list.length > 0) {
          setServices(list);
        } else {
          setServices(servicesCatalog);
        }
      } catch {
        pushToast("Unable to load services.", "error");
        setServices(servicesCatalog);
      } finally {
        setLoading(false);
      }
    };
    loadServices();
  }, [selectedCountry, pushToast]);

  const filtered = useMemo(() => {
    return services
      .filter((service) =>
        service.name.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [services, search]);

  const toggleService = async (service: Service) => {
    if (!selectedCountry) {
      return;
    }
    try {
      await apiClient.patch(
        apiPaths.serviceCountryToggle(service.id, selectedCountry),
        { enabled: !service.enabled }
      );
      setServices((prev) =>
        prev.map((item) =>
          item.id === service.id
            ? { ...item, enabled: !item.enabled }
            : item
        )
      );
      pushToast("Service availability updated.", "success");
    } catch {
      pushToast("Unable to update service.", "error");
    }
  };

  return (
    <div className="space-y-8">
      <SectionHeading
        title="Services"
        description="Enable services per country (all 41 services displayed)."
      />
      <Card className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <Select
            label="Country"
            value={selectedCountry}
            onChange={(event) => setSelectedCountry(event.target.value)}
          >
            {countries.map((country) => (
              <option key={country.iso2} value={country.iso2}>
                {country.name} ({country.iso2})
              </option>
            ))}
          </Select>
          <Input
            label="Search"
            placeholder="Search services"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="py-3">Service</th>
                <th className="py-3">Gender Tag</th>
                <th className="py-3">Sort Order</th>
                <th className="py-3 text-right">Enabled</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-500">
                    Loading services...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-500">
                    No services found.
                  </td>
                </tr>
              ) : (
                filtered.map((service) => (
                  <tr key={service.id} className="border-t">
                    <td className="py-4 font-medium text-slate-900">
                      {service.name}
                    </td>
                    <td className="py-4">
                      <Badge tone="purple">{service.genderTag}</Badge>
                    </td>
                    <td className="py-4 text-slate-600">
                      {service.sortOrder}
                    </td>
                    <td className="py-4 text-right">
                      <Toggle
                        enabled={service.enabled ?? true}
                        onClick={() => toggleService(service)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
