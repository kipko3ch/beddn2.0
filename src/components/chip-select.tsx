"use client";

import { useState } from "react";
import { Check, ChevronDown, SlidersHorizontal } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface ChipSelectOption {
  value: string;
  label: string;
}

/**
 * Pill-shaped dropdown chip used across the category, search, and explore
 * pages for inline filtering. The first option is treated as the neutral
 * default — any other selection marks the chip as "active" (filled style).
 *
 * `variant` controls the visual weight:
 * - `"default"` — outlined chip with icon + chevron (desktop filter bars)
 * - `"compact"` — smaller, no icon, chevron only (mobile filter rows)
 */
export function ChipSelect({
  label,
  value,
  options,
  onChange,
  variant = "default",
}: {
  label: string;
  value: string;
  options: ChipSelectOption[];
  onChange: (value: string) => void;
  variant?: "default" | "compact";
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  // The first option is the neutral default; anything else marks the chip active.
  const active = selected && selected.value !== options[0].value;

  const isCompact = variant === "compact";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border font-semibold shadow-sm transition-colors ${
              isCompact ? "px-3.5 py-2 text-sm" : "px-3.5 py-2 text-sm"
            } ${
              active
                ? "border-[#2b000a] bg-[#2b000a] text-white"
                : "border-[#e3d3d9] bg-white text-[#2b000a]"
            }`}
          />
        }
      >
        {!isCompact && <SlidersHorizontal className="h-3.5 w-3.5" />}
        {active ? selected.label : label}
        <ChevronDown className="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="max-h-80 w-64 overflow-y-auto rounded-2xl p-2"
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              onChange(option.value);
              setOpen(false);
            }}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm hover:bg-muted ${
              option.value === value ? "font-bold" : ""
            }`}
          >
            {option.label}
            {option.value === value && (
              <Check className="h-4 w-4 text-crimson" />
            )}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
