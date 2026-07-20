"use client";

import { Suspense, useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Delete, Lock, ShieldCheck } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { HOST_PIN_LENGTH } from "@/lib/host-pin";

type Stage = "loading" | "create" | "confirm" | "enter" | "locked";

function Dots({ filled, submitting }: { filled: number; submitting: boolean }) {
  if (submitting) {
    return (
      <div className="flex justify-center items-center h-4">
        <span className="animate-spin size-5 border-2 border-[#800020] border-t-transparent rounded-full" />
      </div>
    );
  }
  return (
    <div className="flex justify-center gap-4">
      {Array.from({ length: HOST_PIN_LENGTH }).map((_, i) => (
        <span
          key={i}
          className={`size-4 rounded-full border-2 border-[#800020] transition-colors ${
            i < filled ? "bg-[#800020]" : "bg-white"
          }`}
        />
      ))}
    </div>
  );
}

function Keypad({ onDigit, onBackspace, disabled }: { onDigit: (d: string) => void; onBackspace: () => void; disabled: boolean }) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];
  return (
    <div className="mx-auto grid w-full max-w-[280px] xs:max-w-xs grid-cols-3 gap-3">
      {keys.map((key, i) =>
        key === "" ? (
          <span key={i} />
        ) : key === "back" ? (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={onBackspace}
            aria-label="Delete digit"
            className="flex h-14 sm:h-16 items-center justify-center rounded-2xl text-[#2b000a] hover:bg-[#f5f1f2] disabled:opacity-40"
          >
            <Delete className="h-6 w-6" />
          </button>
        ) : (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => onDigit(key)}
            className="flex h-14 sm:h-16 items-center justify-center rounded-2xl bg-[#fbf7f8] text-2xl font-bold text-[#2b000a] hover:bg-[#f5f1f2] disabled:opacity-40"
          >
            {key}
          </button>
        )
      )}
    </div>
  );
}

function UnlockInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = useMemo(() => {
    const raw = searchParams.get("next") || ROUTES.dashboard;
    return raw.startsWith("/") && !raw.startsWith("//") ? raw : ROUTES.dashboard;
  }, [searchParams]);

  const [stage, setStage] = useState<Stage>("loading");
  const [pin, setPin] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [error, setError] = useState("");
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const stateRef = useRef({ stage, pin, firstPin, submitting });
  useEffect(() => {
    stateRef.current = { stage, pin, firstPin, submitting };
  });

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const { stage, pin, firstPin, submitting } = stateRef.current;
      if (stage === "loading" || stage === "locked") return;

      if (e.key >= "0" && e.key <= "9") {
        if (submitting || pin.length >= HOST_PIN_LENGTH) return;
        setError("");
        const nextPin = pin + e.key;
        setPin(nextPin);
        if (nextPin.length !== HOST_PIN_LENGTH) return;

        if (stage === "enter") {
          submitPin(nextPin);
          return;
        }
        if (stage === "create") {
          setFirstPin(nextPin);
          setPin("");
          setStage("confirm");
          return;
        }
        if (stage === "confirm") {
          if (nextPin !== firstPin) {
            setError("Those codes did not match. Try again.");
            setFirstPin("");
            setPin("");
            setStage("create");
            return;
          }
          submitPin(nextPin);
        }
      } else if (e.key === "Backspace") {
        if (submitting) return;
        setPin((p) => p.slice(0, -1));
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    fetch("/api/host/pin")
      .then((r) => (r.ok ? r.json() : { hasPin: false, lockedUntil: null }))
      .then((j: { hasPin: boolean; lockedUntil: string | null }) => {
        if (j.lockedUntil) {
          setLockedUntil(j.lockedUntil);
          setStage("locked");
        } else {
          setStage(j.hasPin ? "enter" : "create");
        }
      })
      .catch(() => setStage("create"));
  }, []);

  async function submitPin(value: string) {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/host/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: value }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error || "Something went wrong. Try again.");
        setPin("");
        if (res.status === 429) setStage("locked");
        return;
      }
      router.replace(next);
    } finally {
      setSubmitting(false);
    }
  }

  function onDigit(d: string) {
    if (submitting || pin.length >= HOST_PIN_LENGTH) return;
    setError("");
    const nextPin = pin + d;
    setPin(nextPin);
    if (nextPin.length !== HOST_PIN_LENGTH) return;

    if (stage === "enter") {
      submitPin(nextPin);
      return;
    }
    if (stage === "create") {
      setFirstPin(nextPin);
      setPin("");
      setStage("confirm");
      return;
    }
    if (stage === "confirm") {
      if (nextPin !== firstPin) {
        setError("Those codes did not match. Try again.");
        setFirstPin("");
        setPin("");
        setStage("create");
        return;
      }
      submitPin(nextPin);
    }
  }

  function onBackspace() {
    if (submitting) return;
    setPin((p) => p.slice(0, -1));
  }

  const title =
    stage === "create"
      ? "Set up host dashboard access"
      : stage === "confirm"
      ? "Confirm dashboard access"
      : stage === "locked"
      ? "Access paused"
      : "Switching to host dashboard";

  const subtitle =
    stage === "create"
      ? "Choose a simple 4-digit access code for this device. It keeps host tools separate from normal guest browsing."
      : stage === "confirm"
      ? "Type the same 4 digits once more."
      : stage === "locked"
      ? "Too many wrong tries. Please wait before trying again."
      : "Confirm access to continue. You will stay in host mode for 12 hours on this device.";

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-[#181113]">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
          <Link href={ROUTES.home} className="font-brand text-3xl leading-none text-[#2b000a]">
            Beddn
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f8eef2] px-3 py-1 text-xs font-bold uppercase tracking-widest text-crimson">
            <Lock className="h-3.5 w-3.5" /> Host mode
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-4 py-12 text-center">
        <span className="mb-5 flex size-14 items-center justify-center rounded-full bg-[#f8eef2] text-crimson">
          {stage === "locked" ? <Lock className="h-7 w-7" /> : <ShieldCheck className="h-7 w-7" />}
        </span>
        <h1 className="font-brand text-3xl leading-tight text-[#2b000a]">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>

        {stage === "locked" ? (
          <div className="mt-8 space-y-4">
            {lockedUntil && (
              <p className="text-sm font-semibold text-cranberry">
                Try again after {new Date(lockedUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.
              </p>
            )}
            <Link href={ROUTES.home} className="inline-flex h-11 items-center rounded-full border px-6 text-sm font-semibold hover:bg-muted">
              Back to Beddn
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-8">
              <Dots filled={pin.length} submitting={submitting} />
            </div>
            {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
            <div className="mt-8 w-full">
              <Keypad onDigit={onDigit} onBackspace={onBackspace} disabled={submitting || stage === "loading"} />
            </div>
            <p className="mt-8 text-xs text-muted-foreground">
              Trouble switching? Ask Beddn support to reset dashboard access for you.
            </p>
          </>
        )}
      </main>
    </div>
  );
}

export default function HostUnlockPage() {
  return (
    <Suspense fallback={null}>
      <UnlockInner />
    </Suspense>
  );
}
