"use client";

import { useEffect, useState } from "react";
import { HostMembershipContent } from "@/components/host/host-membership-content";

export default function HostProMembershipPage() {
  const [hostName, setHostName] = useState<string>("");
  const [activeTier, setActiveTier] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/host")
      .then((r) => (r.ok ? r.json() : { host: null }))
      .then((j: { host: { name?: string; is_verified?: boolean } | null }) => {
        if (j.host?.name) setHostName(j.host.name);
        if (j.host?.is_verified) setActiveTier("Verified Host");
      })
      .catch(() => {});
  }, []);

  return <HostMembershipContent hostName={hostName} activeTier={activeTier} backUrl="/host" />;
}
