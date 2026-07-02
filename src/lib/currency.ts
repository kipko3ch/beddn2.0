// Shared currency helpers. Hosts price listings in their own currency
// (listings.currency); guests can optionally view a converted estimate using
// admin-maintained rates (see currency_rates table + /admin/currency).

// The three currencies guests can pick from the global switcher.
export const DISPLAY_CURRENCIES = ["KES", "USD", "TZS"] as const;
export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

// Every currency a host can price a listing in (src/components/listing-form.tsx).
export const HOST_CURRENCIES = ["KES", "TZS", "UGX", "RWF", "USD"] as const;

export type CurrencyRates = Record<string, number>; // currency -> units per 1 USD

export function formatMoney(amount: number, currency: string) {
  return `${currency} ${Math.round(amount).toLocaleString()}`;
}

// Converts `amount` from `from` to `to` using USD as the pivot. Returns null
// when either currency's rate is unknown (caller should fall back to the
// native currency rather than show a wrong number).
export function convertAmount(
  amount: number,
  from: string,
  to: string,
  rates: CurrencyRates
): number | null {
  if (from === to) return amount;
  const fromRate = from === "USD" ? 1 : rates[from];
  const toRate = to === "USD" ? 1 : rates[to];
  if (!fromRate || !toRate) return null;
  const usd = amount / fromRate;
  return usd * toRate;
}
