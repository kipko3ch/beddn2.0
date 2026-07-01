import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROUTES } from "@/lib/routes";
import { AdminShell } from "@/components/admin/admin-shell";

// Server-rendered admin gate. Only a confirmed admin ever loads the console —
// no client-side "checking access…" flash, no dashboard visible before redirect.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(ROUTES.home);
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    redirect(ROUTES.dashboard);
  }

  return <AdminShell>{children}</AdminShell>;
}
