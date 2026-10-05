"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  DISPLAY_CURRENCIES,
  convertAmount,
  formatMoney,
  type CurrencyRates,
  type DisplayCurrency,
} from "@/lib/currency";

const STORAGE_KEY = "beddn_currency";

type Display = DisplayCurrency | "AUTO";

const DEFAULT_RATES: CurrencyRates = {
  USD: 1,
  KES: 129,
  TZS: 2620,
  UGX: 3700,
  RWF: 1380,
};

function detectCountryCurrency(): DisplayCurrency {
  if (typeof window === "undefined") return "KES";
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz.includes("Dar_es_Salaam") || tz.includes("Tanzania")) {
      return "TZS";
    }
    const lang = typeof navigator !== "undefined" ? navigator.language || "" : "";
    if (lang.endsWith("-TZ") || lang === "tz") {
      return "TZS";
    }
    // Kenya & East Africa default
    return "KES";
  } catch {
    return "KES";
  }
}

interface CurrencyContextValue {
  display: Display;
  resolvedCurrency: DisplayCurrency;
  setDisplay: (value: Display) => void;
  rates: CurrencyRates;
  // Uniform pricing formatter: converts amounts to the visitor's local currency (KES in Kenya, TZS in Tanzania, or chosen currency)
  formatPrice: (amount: number, nativeCurrency: string) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [display, setDisplayState] = useState<Display>("AUTO");
  const [autoCurrency, setAutoCurrency] = useState<DisplayCurrency>("KES");
  const [rates, setRates] = useState<CurrencyRates>(DEFAULT_RATES);

  useEffect(() => {
    // 1. Detect visitor country currency
    const detected = detectCountryCurrency();
    setAutoCurrency(detected);

    // 2. Load manually saved preference if any
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && (saved === "AUTO" || (DISPLAY_CURRENCIES as readonly string[]).includes(saved))) {
      setDisplayState(saved as Display);
    }

    // 3. Update rates from live exchange rates API
    fetch("/api/public/currency")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { rates?: CurrencyRates } | null) => {
        if (j?.rates) {
          setRates((prev) => ({ ...prev, ...j.rates }));
        }
      })
      .catch(() => {});
  }, []);

  const setDisplay = useCallback((value: Display) => {
    setDisplayState(value);
    window.localStorage.setItem(STORAGE_KEY, value);
  }, []);

  const resolvedCurrency: DisplayCurrency = useMemo(() => {
    if (display === "AUTO") {
      return autoCurrency;
    }
    return display;
  }, [display, autoCurrency]);

  const formatPrice = useCallback(
    (amount: number, nativeCurrency: string) => {
      const targetCurrency = resolvedCurrency;
      if (!targetCurrency || targetCurrency === nativeCurrency) {
        return formatMoney(amount, nativeCurrency);
      }
      const converted = convertAmount(amount, nativeCurrency, targetCurrency, rates);
      if (converted == null) return formatMoney(amount, nativeCurrency);
      return formatMoney(converted, targetCurrency);
    },
    [resolvedCurrency, rates]
  );

  const value = useMemo(
    () => ({ display, resolvedCurrency, setDisplay, rates, formatPrice }),
    [display, resolvedCurrency, setDisplay, rates, formatPrice]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
