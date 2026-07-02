"use client";

import { useMemo, useState } from "react";
import { AMENITY_GROUPS } from "@/lib/amenities";
import { AmenityIcon } from "@/components/amenity-icon";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, Check } from "lucide-react";

interface AmenityPickerProps {
  value: string[];
  onChange: (next: string[]) => void;
}

export function AmenityPicker({ value, onChange }: AmenityPickerProps) {
  const [query, setQuery] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const selected = useMemo(() => new Set(value), [value]);
  const normalized = query.trim().toLowerCase();

  function toggle(amenityValue: string) {
    if (selected.has(amenityValue)) {
      onChange(value.filter((v) => v !== amenityValue));
    } else {
      onChange([...value, amenityValue]);
    }
  }

  // When searching, show every matching amenity regardless of group collapse.
  const groups = useMemo(() => {
    if (!normalized) return AMENITY_GROUPS;
    return AMENITY_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter(
        (a) =>
          a.label.toLowerCase().includes(normalized) ||
          a.value.includes(normalized)
      ),
    })).filter((g) => g.items.length > 0);
  }, [normalized]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search amenities (e.g. pool, wifi, generator)…"
          className="pl-9"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {value.length > 0
          ? `${value.length} selected`
          : "Tap everything your place offers."}
      </p>

      <div className="space-y-2">
        {groups.map((group) => {
          const open = normalized ? true : openGroups[group.group] ?? false;
          const selectedInGroup = group.items.filter((a) =>
            selected.has(a.value)
          ).length;
          return (
            <div key={group.group} className="rounded-xl border">
              <button
                type="button"
                onClick={() =>
                  !normalized &&
                  setOpenGroups((p) => ({ ...p, [group.group]: !open }))
                }
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-sm font-semibold text-[#181113]">
                  {group.group}
                  {selectedInGroup > 0 && (
                    <span className="ml-2 rounded-full bg-crimson px-2 py-0.5 text-xs font-medium text-white">
                      {selectedInGroup}
                    </span>
                  )}
                </span>
                {!normalized && (
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                      open ? "rotate-180" : ""
                    }`}
                  />
                )}
              </button>

              {open && (
                <div className="grid grid-cols-2 gap-2 border-t p-3 sm:grid-cols-3">
                  {group.items.map((amenity) => {
                    const isOn = selected.has(amenity.value);
                    return (
                      <button
                        key={amenity.value}
                        type="button"
                        onClick={() => toggle(amenity.value)}
                        aria-pressed={isOn}
                        className={`relative flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                          isOn
                            ? "border-[#800020] bg-[#fbf7f8] font-medium text-[#2b000a]"
                            : "border-border bg-white hover:border-[#d7a9b7]"
                        }`}
                      >
                        <AmenityIcon
                          icon={amenity.icon}
                          width={20}
                          height={20}
                          className={isOn ? "text-crimson" : "text-muted-foreground"}
                        />
                        <span className="min-w-0 flex-1 truncate">{amenity.label}</span>
                        {isOn && <Check className="h-4 w-4 shrink-0 text-crimson" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {groups.length === 0 && (
          <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            No amenities match “{query}”.
          </p>
        )}
      </div>
    </div>
  );
}
