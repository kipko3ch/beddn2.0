"use client";

import { useState } from "react";
import { Lightbulb, Copy, Check, ChevronDown } from "lucide-react";

interface CopyGuideProps {
  /** Short title for the collapsible, e.g. "See an example". */
  title?: string;
  /** The example/guide text shown and copied. */
  text: string;
}

/**
 * A small collapsible "guide" panel with a Copy button. Used under free-text
 * fields so hosts can copy a starter template to type from.
 */
export function CopyGuide({ title = "See an example you can copy", text }: CopyGuideProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  return (
    <div className="mt-2 rounded-xl border border-[#f0d9e0] bg-[#fbf7f8]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-crimson"
      >
        <Lightbulb className="h-4 w-4" />
        <span className="flex-1">{title}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-[#f0d9e0] p-3">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-[#41353a]">
            {text}
          </pre>
          <button
            type="button"
            onClick={copy}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-crimson px-4 py-1.5 text-xs font-semibold text-white hover:bg-cranberry"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy template"}
          </button>
        </div>
      )}
    </div>
  );
}
