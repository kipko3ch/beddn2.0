"use client";

import { useEffect, useState } from "react";

/**
 * Branded, lightweight loading screen — the Beddn wordmark with bouncing dots.
 * It waits `delayMs` before appearing so quick loads never flash a spinner
 * (keeps fast sections feeling instant); slow sections get a clean screen.
 */
export function BeddnLoader({
  label,
  delayMs = 200,
  className = "",
}: {
  label?: string;
  delayMs?: number;
  className?: string;
}) {
  const [show, setShow] = useState(delayMs === 0);

  useEffect(() => {
    if (delayMs === 0) return;
    const t = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);

  if (!show) return null;

  return (
    <div
      className={`flex min-h-[50vh] w-full flex-col items-center justify-center gap-5 ${className}`}
    >
      <span className="font-brand text-5xl leading-none text-[#2b000a]">Beddn</span>
      <span className="flex gap-1.5" aria-hidden>
        <span className="h-2 w-2 animate-bounce rounded-full bg-[#800020] [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-[#800020] [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-[#800020]" />
      </span>
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
