"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";

/**
 * Full-screen animated transition overlay that plays when switching between
 * traveler and host modes. Shows a short branded animation before navigating.
 */
export function RoleSwitchTransition({
  to,
  mode,
  onDone,
}: {
  /** Target URL to navigate to after the animation. */
  to: string;
  /** Which mode the user is switching TO. */
  mode: "host" | "traveler";
  /** Fires after navigation completes (can be used to close parent sheet/dialog). */
  onDone?: () => void;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<"enter" | "exit">("enter");

  useEffect(() => {
    // Phase 1: entrance animation (400ms), then start exit + navigate
    const enterTimer = setTimeout(() => {
      setPhase("exit");
      router.push(to);
      onDone?.();
    }, 600);

    return () => clearTimeout(enterTimer);
  }, [to, router, onDone]);

  const isHost = mode === "host";

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-300 ${
        phase === "enter" ? "opacity-100" : "opacity-0"
      }`}
      style={{
        background: isHost
          ? "linear-gradient(135deg, #2b000a 0%, #800020 50%, #a0334d 100%)"
          : "linear-gradient(135deg, #f7f3f4 0%, #ffffff 50%, #fbf7f8 100%)",
      }}
    >
      {/* Animated icon */}
      <div
        className={`mb-5 flex size-16 items-center justify-center rounded-2xl transition-all duration-500 ${
          phase === "enter" ? "scale-100 opacity-100" : "scale-110 opacity-0"
        } ${isHost ? "bg-white/15" : "bg-[#800020]/10"}`}
      >
        <Icon
          icon={isHost ? "line-md:account" : "line-md:search"}
          className={`h-8 w-8 ${isHost ? "text-white" : "text-[#800020]"}`}
        />
      </div>

      {/* Title */}
      <p
        className={`font-brand text-2xl transition-all duration-500 delay-100 ${
          phase === "enter" ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        } ${isHost ? "text-white" : "text-[#2b000a]"}`}
      >
        {isHost ? "Switching to host" : "Switching to traveler"}
      </p>

      {/* Subtitle */}
      <p
        className={`mt-2 text-sm transition-all duration-500 delay-200 ${
          phase === "enter" ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        } ${isHost ? "text-white/70" : "text-[#6f6568]"}`}
      >
        {isHost ? "Loading your dashboard…" : "Back to browsing stays…"}
      </p>

      {/* Spinner */}
      <div
        className={`mt-8 transition-all duration-500 delay-300 ${
          phase === "enter" ? "scale-100 opacity-100" : "scale-90 opacity-0"
        }`}
      >
        <span
          className={`block size-6 animate-spin rounded-full border-2 border-t-transparent ${
            isHost ? "border-white/40" : "border-[#800020]/30"
          }`}
        />
      </div>
    </div>
  );
}
