"use client";

import { useEffect, useMemo, useState } from "react";
import {
  GoogleMap,
  Marker,
  InfoWindow,
  useJsApiLoader,
} from "@react-google-maps/api";

import { ModuleHeader } from "@/components/dashboard/module-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { fetchLiveProviders } from "@/lib/api/liveMap";

type LiveProvider = {
  _id: string;
  name?: string;
  email?: string;
  role?: string;
  isOnline?: boolean;
  lastSeenAt?: string;
  towTruckTypes?: string[];
  carTypesSupported?: string[];
  location?: {
    lat: number;
    lng: number;
  };
};

const defaultCenter = {
  lat: -26.2041,
  lng: 28.0473,
};

type FilterRole = "ALL" | "TowTruck" | "Mechanic";

export default function LiveMapPage() {
  const [providers, setProviders] = useState<LiveProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<LiveProvider | null>(null);
  const [roleFilter, setRoleFilter] = useState<FilterRole>("ALL");

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const loadProviders = async () => {
    setError(null);
    try {
      const data = await fetchLiveProviders();
      setProviders(data?.providers || []);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Failed to load live providers"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();

    // ✅ refresh every 10 seconds
    const interval = setInterval(loadProviders, 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredProviders = useMemo(() => {
    if (roleFilter === "ALL") return providers;
    return providers.filter((p) => p.role === roleFilter);
  }, [providers, roleFilter]);

  const mapCenter = useMemo(() => {
    if (filteredProviders.length > 0 && filteredProviders[0].location?.lat) {
      return filteredProviders[0].location;
    }
    return defaultCenter;
  }, [filteredProviders]);

  const onlineTowTrucks = providers.filter((p) => p.role === "TowTruck").length;
  const onlineMechanics = providers.filter((p) => p.role === "Mechanic").length;

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Live Map / Fleet Control"
        description="Monitor all online providers and fleet activity in real time."
      />

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base">Online Providers</CardTitle>
            <p className="text-sm text-muted-foreground">
              Live provider tracking & fleet visibility.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{providers.length} total online</Badge>
            <Badge className="bg-indigo-600">{onlineTowTrucks} TowTrucks</Badge>
            <Badge className="bg-orange-600">{onlineMechanics} Mechanics</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* ✅ Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={roleFilter === "ALL" ? "default" : "outline"}
              onClick={() => setRoleFilter("ALL")}
            >
              All
            </Button>

            <Button
              size="sm"
              variant={roleFilter === "TowTruck" ? "default" : "outline"}
              onClick={() => setRoleFilter("TowTruck")}
            >
              Tow Trucks
            </Button>

            <Button
              size="sm"
              variant={roleFilter === "Mechanic" ? "default" : "outline"}
              onClick={() => setRoleFilter("Mechanic")}
            >
              Mechanics
            </Button>

            <div className="ml-auto text-xs text-muted-foreground">
              {lastUpdated
                ? `Updated: ${lastUpdated.toLocaleTimeString()}`
                : "Updating..."}
            </div>
          </div>

          {/* ✅ Loading/Error */}
          {loading && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Loading live map...
            </div>
          )}

          {error && (
            <div className="py-6 text-center text-sm text-red-600">{error}</div>
          )}

          {/* ✅ Map */}
          {!loading && !error && (
            <div className="h-[600px] w-full overflow-hidden rounded-lg border">
              {!isLoaded ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Loading Google Maps...
                </div>
              ) : (
                <GoogleMap
                  mapContainerStyle={{ width: "100%", height: "100%" }}
                  center={mapCenter}
                  zoom={11}
                  options={{
                    fullscreenControl: false,
                    streetViewControl: false,
                    mapTypeControl: false,
                  }}
                >
                  {filteredProviders.map((p) => (
                    <Marker
                      key={p._id}
                      position={p.location!}
                      onClick={() => setSelected(p)}
                      label={{
                        text: p.role === "TowTruck" ? "T" : "M",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    />
                  ))}

                  {selected && selected.location && (
                    <InfoWindow
                      position={selected.location}
                      onCloseClick={() => setSelected(null)}
                    >
                      <div className="space-y-1 text-sm">
                        <div className="font-semibold">{selected.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {selected.email}
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1">
                          <Badge variant="secondary">
                            {selected.role === "TowTruck"
                              ? "Tow Truck"
                              : "Mechanic"}
                          </Badge>

                          {selected.isOnline && (
                            <Badge className="bg-green-600">Online</Badge>
                          )}
                        </div>

                        {selected.lastSeenAt && (
                          <div className="text-xs text-muted-foreground pt-1">
                            Last seen:{" "}
                            {new Date(selected.lastSeenAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </InfoWindow>
                  )}
                </GoogleMap>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
