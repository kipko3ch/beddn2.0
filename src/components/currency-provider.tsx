"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DISPLAY_CURRENCIES, convertAmount, formatMoney, type CurrencyRates, type DisplayCurrency } from "@/lib/currency";

const STORAGE_KEY = "beddn_currency";

type Display = DisplayCurrency | "AUTO";

interface CurrencyContextValue {
  display: Display;
  setDisplay: (value: Display) => void;
  rates: CurrencyRates;
  // Renders `amount` (priced in `nativeCurrency`) in the guest's chosen
  // display currency when possible, prefixed with "≈"; falls back to the
  // listing's own currency when no conversion is set or a rate is missing.
  formatPrice: (amount: number, nativeCurrency: string) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [display, setDisplayState] = useState<Display>("AUTO");
  const [rates, setRates] = useState<CurrencyRates>({ USD: 1 });

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && (saved === "AUTO" || (DISPLAY_CURRENCIES as readonly string[]).includes(saved))) {
      setDisplayState(saved as Display);
    }
    fetch("/api/public/currency")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { rates?: CurrencyRates } | null) => {
        if (j?.rates) setRates(j.rates);
      })
      .catch(() => {});
  }, []);

  const setDisplay = useCallback((value: Display) => {
    setDisplayState(value);
    window.localStorage.setItem(STORAGE_KEY, value);
  }, []);

  const formatPrice = useCallback(
    (amount: number, nativeCurrency: string) => {
      if (display === "AUTO" || display === nativeCurrency) {
        return formatMoney(amount, nativeCurrency);
      }
      const converted = convertAmount(amount, nativeCurrency, display, rates);
      if (converted == null) return formatMoney(amount, nativeCurrency);
      return `≈ ${formatMoney(converted, display)}`;
    },
    [display, rates]
  );

  const value = useMemo(
    () => ({ display, setDisplay, rates, formatPrice }),
    [display, setDisplay, rates, formatPrice]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
