import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
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
  const pathname = (await headers()).get('x-pathname') ?? '';
  if (pathname === ROUTES.hostLogin || pathname === ROUTES.hostUnlock) {
    return <>{children}</>;
  }

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
    admin.from('profiles').select('is_admin').eq('id', user.id).maybeSingle(),
    admin.from('hosts').select('id, status').eq('user_id', user.id).maybeSingle(),
  ]);

  const isAdmin = Boolean(profile?.is_admin);
  const hostStatus = (host?.status as string | undefined) ?? null;

  // A host who exists but isn't approved sees a clear status screen instead of
  // the dashboard. Only a *pending* host (still awaiting the first review) can
  // still reach the profile page to finish their details — a rejected or
  // suspended host is blocked everywhere, full stop.
  const canEditProfileWhileWaiting = hostStatus === 'pending' && pathname === ROUTES.dashboardProfile;
  if (host && !isAdmin && hostStatus && hostStatus !== 'approved' && !canEditProfileWhileWaiting) {
    return <HostApprovalScreen status={hostStatus} />;
  }

  return (
    <HostShell email={user.email ?? ''} isAdmin={isAdmin} isHost={Boolean(host)}>
      {children}
    </HostShell>
  );
}
