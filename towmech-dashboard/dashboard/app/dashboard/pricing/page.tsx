"use client";

import { useEffect, useMemo, useState } from "react";

import { ModuleHeader } from "@/components/dashboard/module-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { fetchPricingConfig, updatePricingConfig } from "@/lib/api/pricing";
import { useCountryStore } from "@/lib/store/countryStore";

type ProviderPricing = {
  baseFee: number;
  perKmFee: number;
  nightFee: number;
  weekendFee: number;
};

type TowTruckTypePricingMap = Record<string, ProviderPricing>;

type BookingFees = {
  towTruckPercent?: number;
  mechanicFixed?: number;
};

type PricingConfig = {
  currency?: string;

  providerBasePricing?: {
    towTruck?: ProviderPricing;
    mechanic?: ProviderPricing;
  };

  // ✅ per-type TowTruck pricing (Admin primary settings)
  towTruckTypePricing?: TowTruckTypePricingMap;

  // ✅ booking fees (what the Android app uses as mechanic fallback)
  bookingFees?: BookingFees;
};

const defaultTowTruck: ProviderPricing = {
  baseFee: 50,
  perKmFee: 15,
  nightFee: 0,
  weekendFee: 0,
};

const defaultMechanic: ProviderPricing = {
  baseFee: 30,
  perKmFee: 10,
  nightFee: 0,
  weekendFee: 0,
};

// ✅ NEW preferred names (cheapest → most expensive)
const TOW_TRUCK_TYPES = [
  "Hook & Chain",
  "Wheel-Lift",
  "Flatbed/Roll Back",
  "Boom Trucks(With Crane)",
  "Integrated / Wrecker",
  "Heavy-Duty Rotator(Recovery)",
] as const;

const defaultTowTruckTypePricing: ProviderPricing = {
  baseFee: 20,
  perKmFee: 20,
  nightFee: 0,
  weekendFee: 0,
};

function ensureTowTruckTypePricing(
  incoming: TowTruckTypePricingMap | undefined | null
): TowTruckTypePricingMap {
  const map: TowTruckTypePricingMap = { ...(incoming || {}) };

  // Ensure all types exist (do not delete anything else)
  for (const t of TOW_TRUCK_TYPES) {
    if (!map[t]) map[t] = { ...defaultTowTruckTypePricing };
    else {
      map[t] = {
        baseFee: Number(map[t].baseFee ?? defaultTowTruckTypePricing.baseFee),
        perKmFee: Number(map[t].perKmFee ?? defaultTowTruckTypePricing.perKmFee),
        nightFee: Number(map[t].nightFee ?? defaultTowTruckTypePricing.nightFee),
        weekendFee: Number(map[t].weekendFee ?? defaultTowTruckTypePricing.weekendFee),
      };
    }
  }

  return map;
}

export default function PricingPage() {
  const [config, setConfig] = useState<PricingConfig | null>(null);

  const [activeTab, setActiveTab] = useState<"TowTruck" | "Mechanic">("TowTruck");

  // ✅ TowTruck Type selector (only used in TowTruck tab)
  const [selectedTowTruckType, setSelectedTowTruckType] = useState<string>(
    TOW_TRUCK_TYPES[0]
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ✅ multi-country scope
  const { countryCode } = useCountryStore();

  const loadConfig = async () => {
    if (!countryCode) {
      setConfig(null);
      setLoading(false);
      setError("Please select a country first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchPricingConfig();
      const cfg = data?.config;

      const towTruck = cfg?.providerBasePricing?.towTruck || defaultTowTruck;
      const mechanic = cfg?.providerBasePricing?.mechanic || defaultMechanic;

      const safeTowTruckTypePricing = ensureTowTruckTypePricing(cfg?.towTruckTypePricing);

      const bookingFees: BookingFees = {
        towTruckPercent: Number(cfg?.bookingFees?.towTruckPercent ?? 15),
        mechanicFixed: Number(cfg?.bookingFees?.mechanicFixed ?? 200),
      };

      setConfig({
        currency: cfg?.currency || "ZAR",
        providerBasePricing: {
          towTruck,
          mechanic,
        },
        towTruckTypePricing: safeTowTruckTypePricing,
        bookingFees,
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load pricing config");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryCode]);

  // ✅ current TowTruck type pricing (from config)
  const currentTowTruckTypePricing = useMemo(() => {
    const map = config?.towTruckTypePricing || ensureTowTruckTypePricing(undefined);
    return map[selectedTowTruckType] || { ...defaultTowTruckTypePricing };
  }, [config?.towTruckTypePricing, selectedTowTruckType]);

  // ✅ current Mechanic pricing
  const currentMechanicPricing =
    config?.providerBasePricing?.mechanic || defaultMechanic;

  const updateMechanicField = (field: keyof ProviderPricing, value: number) => {
    if (!config) return;

    const updated: PricingConfig = {
      ...config,
      providerBasePricing: {
        ...config.providerBasePricing,
        mechanic: {
          ...(config.providerBasePricing?.mechanic || defaultMechanic),
          [field]: value,
        },
      },
    };

    setConfig(updated);
  };

  const updateTowTruckTypeField = (field: keyof ProviderPricing, value: number) => {
    if (!config) return;

    const map = ensureTowTruckTypePricing(config.towTruckTypePricing);

    const updated: PricingConfig = {
      ...config,
      towTruckTypePricing: {
        ...map,
        [selectedTowTruckType]: {
          ...(map[selectedTowTruckType] || { ...defaultTowTruckTypePricing }),
          [field]: value,
        },
      },
    };

    setConfig(updated);
  };

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const mechanicBaseFee = Number(
        config.providerBasePricing?.mechanic?.baseFee ?? defaultMechanic.baseFee
      );

      /**
       * ✅ IMPORTANT FIX:
       * When saving Mechanic tab, ALSO update bookingFees.mechanicFixed
       * so the Android app stops falling back to 200.
       *
       * ✅ DOES NOT TOUCH towTruckTypePricing (so your per-type settings remain intact).
       */
      const payload: any = {
        currency: config.currency,
        providerBasePricing: config.providerBasePricing,
        towTruckTypePricing: config.towTruckTypePricing,
        bookingFees: {
          towTruckPercent: Number(config.bookingFees?.towTruckPercent ?? 15),
          mechanicFixed:
            activeTab === "Mechanic"
              ? mechanicBaseFee
              : Number(config.bookingFees?.mechanicFixed ?? 200),
        },
      };

      const res = await updatePricingConfig(payload);

      const returned = res?.config;
      if (returned) {
        const safeTowTruckTypePricing = ensureTowTruckTypePricing(
          returned?.towTruckTypePricing
        );

        setConfig({
          currency: returned?.currency || config.currency || "ZAR",
          providerBasePricing: {
            towTruck:
              returned?.providerBasePricing?.towTruck ||
              config.providerBasePricing?.towTruck ||
              defaultTowTruck,
            mechanic:
              returned?.providerBasePricing?.mechanic ||
              config.providerBasePricing?.mechanic ||
              defaultMechanic,
          },
          towTruckTypePricing: safeTowTruckTypePricing,
          bookingFees: {
            towTruckPercent: Number(returned?.bookingFees?.towTruckPercent ?? 15),
            mechanicFixed: Number(
              returned?.bookingFees?.mechanicFixed ??
                payload.bookingFees.mechanicFixed ??
                200
            ),
          },
        });
      } else {
        setConfig(config);
      }

      setMessage("✅ Pricing updated successfully!");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to update pricing");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Pricing & Commission Controls"
        description="Control TowTruck and Mechanic pricing, including night and weekend incentives."
      />

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base">Provider Pricing Rules</CardTitle>
            <p className="text-sm text-muted-foreground">
              Configure TowTruck per-type pricing (primary) and Mechanic pricing.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              className={
                activeTab === "TowTruck"
                  ? "bg-indigo-600 cursor-pointer"
                  : "bg-slate-200 text-slate-700 cursor-pointer"
              }
              onClick={() => setActiveTab("TowTruck")}
            >
              TowTruck
            </Badge>

            <Badge
              className={
                activeTab === "Mechanic"
                  ? "bg-orange-600 cursor-pointer"
                  : "bg-slate-200 text-slate-700 cursor-pointer"
              }
              onClick={() => setActiveTab("Mechanic")}
            >
              Mechanic
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {loading && (
            <div className="text-sm text-muted-foreground">
              Loading pricing config...
            </div>
          )}

          {error && <div className="text-sm text-red-600">{error}</div>}
          {message && <div className="text-sm text-green-700">{message}</div>}

          {!loading && config && (
            <>
              {/* Currency (global) */}
              <div className="space-y-2 max-w-xs">
                <label className="text-sm font-medium text-slate-700">
                  Currency
                </label>
                <Input
                  value={config.currency || ""}
                  onChange={(e) => setConfig({ ...config, currency: e.target.value })}
                  placeholder="ZAR"
                />
              </div>

              {activeTab === "TowTruck" && (
                <>
                  {/* TowTruck Type Selector */}
                  <div className="space-y-2 max-w-md">
                    <label className="text-sm font-medium text-slate-700">
                      TowTruck Type (Primary Pricing)
                    </label>

                    <select
                      value={selectedTowTruckType}
                      onChange={(e) => setSelectedTowTruckType(e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {TOW_TRUCK_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>

                    <p className="text-xs text-muted-foreground">
                      These values are the primary admin settings for the selected TowTruck
                      type. Distance, surge, vehicle multipliers, and any remaining multipliers
                      are applied automatically by the backend.
                    </p>
                  </div>

                  {/* TowTruck Type Pricing Fields */}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        Base Fee
                      </label>
                      <Input
                        type="number"
                        value={currentTowTruckTypePricing.baseFee ?? 0}
                        onChange={(e) =>
                          updateTowTruckTypeField("baseFee", Number(e.target.value))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        Per KM Fee
                      </label>
                      <Input
                        type="number"
                        value={currentTowTruckTypePricing.perKmFee ?? 0}
                        onChange={(e) =>
                          updateTowTruckTypeField("perKmFee", Number(e.target.value))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        Night Fee (20:00 - 06:00)
                      </label>
                      <Input
                        type="number"
                        value={currentTowTruckTypePricing.nightFee ?? 0}
                        onChange={(e) =>
                          updateTowTruckTypeField("nightFee", Number(e.target.value))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        Weekend Fee (Sat/Sun)
                      </label>
                      <Input
                        type="number"
                        value={currentTowTruckTypePricing.weekendFee ?? 0}
                        onChange={(e) =>
                          updateTowTruckTypeField("weekendFee", Number(e.target.value))
                        }
                      />
                    </div>
                  </div>
                </>
              )}

              {activeTab === "Mechanic" && (
                <>
                  {/* Mechanic Pricing Fields */}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        Base Fee
                      </label>
                      <Input
                        type="number"
                        value={currentMechanicPricing.baseFee ?? 0}
                        onChange={(e) =>
                          updateMechanicField("baseFee", Number(e.target.value))
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        This also controls the Mechanic booking fee fallback used by the mobile
                        app.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        Per KM Fee
                      </label>
                      <Input
                        type="number"
                        value={currentMechanicPricing.perKmFee ?? 0}
                        onChange={(e) =>
                          updateMechanicField("perKmFee", Number(e.target.value))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        Night Fee (20:00 - 06:00)
                      </label>
                      <Input
                        type="number"
                        value={currentMechanicPricing.nightFee ?? 0}
                        onChange={(e) =>
                          updateMechanicField("nightFee", Number(e.target.value))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        Weekend Fee (Sat/Sun)
                      </label>
                      <Input
                        type="number"
                        value={currentMechanicPricing.weekendFee ?? 0}
                        onChange={(e) =>
                          updateMechanicField("weekendFee", Number(e.target.value))
                        }
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving || !countryCode}>
                  {saving ? "Saving..." : "Save Pricing"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}