"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { toastManager, ToastProvider } from "@/components/ui/toast";

export default function ToastTimeoutDemo() {
  const persistentIdRef = useRef<string | null>(null);

  function showPersistent() {
    if (persistentIdRef.current) return;
    persistentIdRef.current = toastManager.add({
      actionProps: {
        children: "Dismiss",
        onClick: () => {
          if (persistentIdRef.current) {
            toastManager.close(persistentIdRef.current);
            persistentIdRef.current = null;
          }
        },
      },
      description: "This toast stays until you dismiss it manually.",
      timeout: 0,
      title: "Persistent notification",
      type: "warning",
    });
  }

  function showTimed(ms: number) {
    toastManager.add({
      description: `This toast auto-dismisses after ${ms / 1000}s.`,
      timeout: ms,
      title: `Auto-dismiss in ${ms / 1000}s`,
      type: "info",
    });
  }

  return (
    <ToastProvider>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => showTimed(3000)} variant="outline">
          3s toast
        </Button>
        <Button onClick={() => showTimed(8000)} variant="outline">
          8s toast
        </Button>
        <Button onClick={showPersistent} variant="outline">
          Persistent toast
        </Button>
      </div>
    </ToastProvider>
  );
}
