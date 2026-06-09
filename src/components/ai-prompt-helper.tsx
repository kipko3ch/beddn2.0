"use client";

import { useMemo, useState } from "react";
import { Sparkles, Copy, Check, ExternalLink, ChevronDown } from "lucide-react";

export interface ListingPromptFacts {
  name?: string;
  propertyTypeLabel?: string;
  bookingKinds?: string[]; // e.g. ["Hourly", "Overnight"]
  country?: string;
  region?: string;
  district?: string;
  village?: string;
  amenityLabels?: string[];
  units?: string;
}

/**
 * Builds a ready-to-paste ChatGPT prompt from the listing details the host has
 * entered so far, and lets them copy it + open ChatGPT. No API key needed — the
 * host pastes the generated description back into the field themselves.
 */
export function AiPromptHelper({ facts }: { facts: ListingPromptFacts }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const prompt = useMemo(() => buildPrompt(facts), [facts]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  return (
    <div className="mt-2 rounded-xl border border-[#dfe7ff] bg-[#f5f7ff]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-[#2c3e8f]"
      >
        <Sparkles className="h-4 w-4" />
        <span className="flex-1">Write it for me with ChatGPT</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-[#dfe7ff] p-3">
          <p className="mb-2 text-xs text-[#41353a]">
            Copy this prompt, paste it into ChatGPT, then paste the result back into the
            description above.
          </p>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border bg-white p-3 font-sans text-xs leading-5 text-[#41353a]">
            {prompt}
          </pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#2c3e8f] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#22306f]"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy prompt"}
            </button>
            <a
              href="https://chat.openai.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#2c3e8f] px-4 py-1.5 text-xs font-semibold text-[#2c3e8f] hover:bg-white"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open ChatGPT
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function buildPrompt(facts: ListingPromptFacts): string {
  const place = [facts.village, facts.district, facts.region, facts.country]
    .filter(Boolean)
    .join(", ");
  const lines: string[] = [
    "Write a warm, honest, and inviting short-stay listing description (about 120-160 words) for the place below. Use natural language, highlight what makes it special, mention the location vibe, and end with a friendly call to book. Do not invent amenities that are not listed.",
    "",
  ];
  if (facts.name) lines.push(`Place name: ${facts.name}`);
  if (facts.propertyTypeLabel) lines.push(`Property type: ${facts.propertyTypeLabel}`);
  if (facts.bookingKinds?.length)
    lines.push(`Booked as: ${facts.bookingKinds.join(", ")}`);
  if (place) lines.push(`Location: ${place}`);
  if (facts.units) lines.push(`Capacity: ${facts.units} room(s)/unit(s)`);
  if (facts.amenityLabels?.length)
    lines.push(`Amenities: ${facts.amenityLabels.join(", ")}`);
  lines.push("", "Return only the description text, no headings or quotes.");
  return lines.join("\n");
}
