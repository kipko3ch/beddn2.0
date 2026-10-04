"use client";

import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrency } from "@/components/currency-provider";
import { DISPLAY_CURRENCIES } from "@/lib/currency";

const LABEL: Record<string, string> = { KES: "KES — Kenyan Shilling", USD: "USD — US Dollar", TZS: "TZS — Tanzanian Shilling" };

// Global "view prices in..." switcher. Listings keep their host's native
// currency; this only changes how the price is *displayed* to this guest,
// using admin-maintained rates (see /admin/currency).
export function CurrencySwitcher() {
  const { display, setDisplay } = useCurrency();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex size-9 items-center justify-center rounded-full border border-stone-200/90 bg-white text-[#181113] outline-none transition-all hover:bg-stone-50 hover:border-stone-300 focus-visible:ring-2 focus-visible:ring-crimson shadow-2xs"
        aria-label="Choose display currency"
        title="Languages & currency"
      >
        <Globe className="h-4 w-4 text-[#181113]" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem onClick={() => setDisplay("AUTO")}>
          <span className="flex w-full items-center justify-between">
            Local price
            {display === "AUTO" && <span className="text-xs text-cranberry">✓</span>}
          </span>
        </DropdownMenuItem>
        {DISPLAY_CURRENCIES.map((currency) => (
          <DropdownMenuItem key={currency} onClick={() => setDisplay(currency)}>
            <span className="flex w-full items-center justify-between">
              {LABEL[currency] ?? currency}
              {display === currency && <span className="text-xs text-cranberry">✓</span>}
            </span>
          </DropdownMenuItem>
        ))}
        <div className="px-2 pb-1.5 pt-1 text-xs text-muted-foreground">
          Estimated using Beddn&apos;s exchange rate — pay the host in their own currency.
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
