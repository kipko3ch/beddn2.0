import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ROUTES } from '@/lib/routes';
import { HostShell } from '@/components/host/host-shell';
import { HostApprovalScreen } from '@/components/host/host-approval-screen';

// Server-rendered host Extranet gate. Auth and role are resolved here (once),
// so the client shell never re-fetches the user and there is no dead-button
// hydration window. The dedicated /host/login page renders standalone.
export default async function HostLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already redirects signed-out visitors, but guard here too.
  if (!user) {
    redirect(ROUTES.hostLogin);
  }

  const admin = createAdminClient();
  const [{ data: profile }, { data: host }] = await Promise.all([
    admin.from('profiles').select('is_admin, full_name').eq('id', user.id).maybeSingle(),
    admin.from('hosts').select('id, status, name').eq('user_id', user.id).maybeSingle(),
  ]);

  const isAdmin = Boolean(profile?.is_admin);
  const hostStatus = (host?.status as string | undefined) ?? null;
  const userName = host?.name || profile?.full_name || (user.user_metadata?.full_name as string | undefined) || null;

  // Check if host has an active Pro / Featured tier
  let activeTier: string | null = null;
  let activeTierExpires: string | null = null;
  if (host?.id) {
    const { data: featured } = await admin
      .from('featured_listings')
      .select('tier_name, end_date')
      .eq('host_id', host.id)
      .eq('status', 'active')
      .gt('end_date', new Date().toISOString())
      .order('end_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (featured) {
      activeTier = featured.tier_name || 'Pro';
      activeTierExpires = featured.end_date ? new Date(featured.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null;
    }
  }

  // A host who exists but isn't approved sees a clear status screen instead of
  // the dashboard. Only a *pending* host (still awaiting the first review) can
  // still reach the profile page to finish their details — a rejected or
  // suspended host is blocked everywhere, full stop.
  const headersList = await headers();
  const pathname = headersList.get("x-invoke-path") || "";
  const canEditProfileWhileWaiting = hostStatus === 'pending' && pathname === ROUTES.dashboardProfile;
  if (host && !isAdmin && hostStatus && hostStatus !== 'approved' && !canEditProfileWhileWaiting) {
    return <HostApprovalScreen status={hostStatus} />;
  }

  return (
    <HostShell
      email={user.email ?? ''}
      userName={userName}
      hostId={host?.id}
      isAdmin={isAdmin}
      isHost={Boolean(host)}
      activeTier={activeTier}
      activeTierExpires={activeTierExpires}
    >
      {children}
    </HostShell>
  );
}
