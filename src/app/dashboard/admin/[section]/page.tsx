"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// Admin moved to top-level /admin. Redirect any old links.
export default function LegacyAdminSectionRedirect() {
  const params = useParams<{ section: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/admin/${params.section}`);
  }, [params.section, router]);

  return (
    <div className="flex items-center gap-2 py-10 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" /> Redirecting to the admin panel…
    </div>
  );
}
