"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CountryState = {
  // Selected country workspace (used for ALL dashboard API calls)
  countryCode: string;

  // Optional language (future-ready)
  languageCode: string;

  // Setters
  setCountryCode: (code: string) => void;
  setLanguageCode: (code: string) => void;

  // Helpers
  reset: () => void;
};

const DEFAULT_COUNTRY = "ZA";
const DEFAULT_LANGUAGE = "en";

function normalizeIso2(v: any) {
  const code = String(v || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : DEFAULT_COUNTRY;
}

function safeGetInitialCountry(): string {
  if (typeof window === "undefined") return DEFAULT_COUNTRY;

  // ✅ primary workspace key
  const direct = localStorage.getItem("countryCode");
  if (direct && /^[A-Z]{2}$/.test(direct.trim().toUpperCase())) {
    return direct.trim().toUpperCase();
  }

  return DEFAULT_COUNTRY;
}

export const useCountryStore = create<CountryState>()(
  persist(
    (set) => ({
      countryCode: safeGetInitialCountry(),
      languageCode: DEFAULT_LANGUAGE,

      setCountryCode: (code: string) => {
        const normalized = normalizeIso2(code);

        set({ countryCode: normalized });

        // ✅ mirror to the canonical storage key used by axios + layout
        if (typeof window !== "undefined") {
          localStorage.setItem("countryCode", normalized);
          window.dispatchEvent(
            new CustomEvent("towmech:country-changed", { detail: { countryCode: normalized } })
          );
        }
      },

      setLanguageCode: (code: string) =>
        set({
          languageCode: (code || DEFAULT_LANGUAGE).toLowerCase(),
        }),

      reset: () => {
        set({
          countryCode: DEFAULT_COUNTRY,
          languageCode: DEFAULT_LANGUAGE,
        });

        if (typeof window !== "undefined") {
          localStorage.setItem("countryCode", DEFAULT_COUNTRY);
          window.dispatchEvent(
            new CustomEvent("towmech:country-changed", { detail: { countryCode: DEFAULT_COUNTRY } })
          );
        }
      },
    }),
    {
      name: "towmech_country_store",
      version: 1,
    }
  )
);