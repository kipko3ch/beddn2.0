import Link from "next/link";
import { Icon } from "@/components/icon";
import { ROUTES } from "@/lib/routes";

// Shown inside the host area when a host account exists but isn't approved yet.
// Kept encouraging and clear — the host knows exactly what's happening and what
// they can still do (finish their profile) while an admin reviews them.
export function HostApprovalScreen({ status }: { status: string }) {
  const copy: Record<string, { title: string; body: string; tone: string; icon: string }> = {
    pending: {
      title: "Your host account is under review",
      body:
        "Thanks for applying to host on Beddn. Our team is reviewing your details to keep the marketplace safe and trusted. You'll be able to publish your listings as soon as you're approved — usually within a day.",
      tone: "text-amber-700",
      icon: "line-md:loading-twotone-loop",
    },
    rejected: {
      title: "Your host application wasn't approved",
      body:
        "We couldn't approve your host account this time. If you think this is a mistake or you've updated your details, please reach out and we'll take another look.",
      tone: "text-red-700",
      icon: "line-md:alert",
    },
    suspended: {
      title: "Your host account is paused",
      body:
        "Your hosting is temporarily paused. Please contact the Beddn team to resolve this and restore your account.",
      tone: "text-red-700",
      icon: "line-md:alert",
    },
  };
  const c = copy[status] ?? copy.pending;

  return (
    <div className="min-h-screen bg-[#f7f3f4] font-sans text-[#181113]">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link href={ROUTES.home} className="font-brand text-2xl leading-none text-[#2b000a]">
            Beddn
          </Link>
          <span className="rounded-full bg-[#f8eef2] px-2.5 py-1 text-xs font-bold text-[#800020]">
            Host
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <span className={`mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-white shadow-sm ${c.tone}`}>
          <Icon icon={c.icon} className="h-8 w-8" />
        </span>
        <h1 className="font-brand text-3xl text-[#2b000a] sm:text-4xl">{c.title}</h1>
        <p className="mx-auto mt-4 max-w-lg text-base text-muted-foreground">{c.body}</p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={ROUTES.dashboardProfile}
            className="inline-flex h-11 items-center rounded-full bg-[#800020] px-6 text-sm font-bold text-white hover:bg-[#600018]"
          >
            Complete your profile
          </Link>
          <Link
            href={ROUTES.search}
            className="inline-flex h-11 items-center rounded-full border px-6 text-sm font-semibold hover:bg-white"
          >
            Explore stays
          </Link>
        </div>
      </main>
    </div>
  );
}
