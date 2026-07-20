"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ListingForm } from "@/components/listing-form";
import { ExperienceForm } from "@/components/experience-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { ROUTES } from "@/lib/routes";
import type { ListingCategory } from "@/lib/types";

export default function NewListingPage() {
  const supabase = createClient();
  const router = useRouter();
  const [hostId, setHostId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [needsHost, setNeedsHost] = useState(false);

  const [hostName, setHostName] = useState("");
  const [hostPhone, setHostPhone] = useState("");
  const [creatingHost, setCreatingHost] = useState(false);
  const [step, setStep] = useState(0);
  const [initialCategory, setInitialCategory] = useState<ListingCategory | undefined>(undefined);
  const [listingKind, setListingKind] = useState<"stay" | "experience" | null>(null);

  // "Add experience" deep-links here with ?type=experience — start on that path.
  useEffect(() => {
    const type = new URLSearchParams(window.location.search).get("type");
    if (type === "experience") {
      setInitialCategory("experience");
      setListingKind("experience");
    }
  }, []);

  useEffect(() => {
    async function init() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setLoading(false);
        return;
      }

      setHostName(userData.user.user_metadata?.full_name ?? "");

      const [{ data: profile }, { data: host }] = await Promise.all([
        supabase.from("profiles").select("is_admin").eq("id", userData.user.id).single(),
        supabase.from("hosts").select("id").eq("user_id", userData.user.id).single(),
      ]);

      setIsAdmin(profile?.is_admin ?? false);

      if (host) {
        setHostId(host.id);
      } else {
        setNeedsHost(true);
      }
      setLoading(false);
    }
    init();
  }, [supabase]);

  async function createHost(e?: React.FormEvent) {
    e?.preventDefault();
    setCreatingHost(true);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      setCreatingHost(false);
      return;
    }

    const res = await fetch("/api/host", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: hostName, phone: hostPhone }),
    });
    const json = await res.json().catch(() => ({}));

    if (res.ok && json.host) {
      // Land new hosts in the dashboard, not straight into the 13-step
      // listing wizard — they're pending approval and should see that
      // clearly before they're asked to build a listing. Coming back to
      // "New listing" from the dashboard afterward still goes straight in.
      // The host layout gate is a server component reading fresh DB state
      // (the host row this POST just created) — router.refresh() forces
      // Next to re-render it instead of serving a stale cached tree, which
      // is what previously left new hosts staring at the dashboard with no
      // "pending" screen until a manual reload.
      router.push(ROUTES.dashboard);
      router.refresh();
    } else {
      alert("Failed to create host profile: " + (json.error ?? ""));
    }
    setCreatingHost(false);
  }

  if (loading) {
    return null;
  }

  if (!hostId && !needsHost) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">New listing</h1>
        <p className="text-muted-foreground">Please sign in to create a listing.</p>
      </div>
    );
  }

  if (needsHost) {
    const steps = [
      { key: "name", label: "About you" },
      { key: "phone", label: "Contact" },
      { key: "review", label: "Review" },
    ];
    const canNext =
      (step === 0 && hostName.trim().length > 1) ||
      (step === 1 && hostPhone.trim().length >= 7) ||
      step === 2;

    function next() {
      setStep((s) => Math.min(s + 1, steps.length - 1));
    }
    function back() {
      setStep((s) => Math.max(s - 1, 0));
    }

    return (
      <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center pt-4 sm:pt-8">
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span className="uppercase tracking-wide text-cranberry">Host setup</span>
            <span>
              Step {step + 1} of {steps.length}
            </span>
          </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#f1e6ea]">
              <div
              className="h-full rounded-full bg-[#800020] transition-all duration-300"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
          {step === 0 && (
            <div>
              <Image
                src="https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029370/empty-host-needed_vum5fe.png"
                alt=""
                width={140}
                height={110}
                className="mb-5 h-auto w-[130px]"
                aria-hidden
              />
              <h1 className="text-2xl font-bold">What should guests call you?</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This creates your host profile instantly. You can list your first place right after this.
              </p>
              <Input
                autoFocus
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="e.g. Amara Otieno"
                className="mt-5 h-12 text-base"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canNext) next();
                }}
              />
            </div>
          )}

          {step === 1 && (
            <div>
              <h1 className="text-2xl font-bold">What&apos;s your phone number?</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Used for booking alerts. Shared with a guest only after a confirmed booking.
              </p>
              <Input
                autoFocus
                type="tel"
                value={hostPhone}
                onChange={(e) => setHostPhone(e.target.value)}
                placeholder="+254..."
                className="mt-5 h-12 text-base"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canNext) next();
                }}
              />
            </div>
          )}

          {step === 2 && (
            <div>
              <Image
                src="https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029380/spot-verified_anp2nf.png"
                alt=""
                width={130}
                height={110}
                className="mb-5 h-auto w-[120px]"
                aria-hidden
              />
              <h1 className="text-2xl font-bold">Review &amp; continue</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                You can set up your listings now. Our team reviews new hosts before listings go live —
                usually within a day.
              </p>
              <dl className="mt-5 divide-y rounded-xl border">
                <div className="flex items-center justify-between gap-3 p-4 text-sm">
                  <dt className="text-muted-foreground">Name</dt>
                  <dd className="font-medium">{hostName}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 p-4 text-sm">
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd className="font-medium">{hostPhone}</dd>
                </div>
              </dl>
            </div>
          )}

          <div className="mt-7 flex items-center gap-3">
            {step > 0 && (
              <Button type="button" variant="outline" onClick={back} className="h-11 rounded-full px-6">
                Back
              </Button>
            )}
            {step < steps.length - 1 ? (
              <Button
                type="button"
                onClick={next}
                disabled={!canNext}
                className="h-11 flex-1 rounded-full bg-[#800020] font-bold hover:bg-[#6b1029]"
              >
                Continue
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => createHost()}
                disabled={creatingHost}
                className="h-11 flex-1 rounded-full bg-[#800020] font-bold hover:bg-[#6b1029]"
              >
                {creatingHost ? "Creating..." : "Create host profile"}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!listingKind) {
    return (
      <div className="mx-auto max-w-xl pt-4 sm:pt-6">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-cranberry">
            New listing
          </p>
          <h1 className="mt-1 font-brand text-3xl text-[#2b000a]">What are you hosting?</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose one path. You can add both stays and experiences from this dashboard.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setListingKind("stay")}
            className="rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:border-[#d7a9b7] hover:shadow-md"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#f5f1f2] text-[#2b000a]">
              <Icon icon="line-md:home" className="h-5 w-5" />
            </span>
            <p className="mt-4 text-base font-bold text-[#181113]">Stay</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Rooms, homes, studios, workspaces, hourly stays, or nights.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setListingKind("experience")}
            className="rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:border-[#d7a9b7] hover:shadow-md"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#fbf7f8] text-[#800020]">
              <Icon icon="line-md:star" className="h-5 w-5" />
            </span>
            <p className="mt-4 text-base font-bold text-[#181113]">Experience</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tours, classes, trips, activities, sessions, or group experiences.
            </p>
          </button>
        </div>
      </div>
    );
  }

  if (listingKind === "experience" || initialCategory === "experience") {
    return <ExperienceForm hostId={hostId!} isAdmin={isAdmin} />;
  }

  return <ListingForm hostId={hostId!} isAdmin={isAdmin} initialCategory={initialCategory} />;
}
