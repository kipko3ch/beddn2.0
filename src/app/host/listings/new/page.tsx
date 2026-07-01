"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { ListingForm } from "@/components/listing-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ListingCategory } from "@/lib/types";

export default function NewListingPage() {
  const supabase = createClient();
  const [hostId, setHostId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [needsHost, setNeedsHost] = useState(false);

  const [hostName, setHostName] = useState("");
  const [hostPhone, setHostPhone] = useState("");
  const [creatingHost, setCreatingHost] = useState(false);
  const [step, setStep] = useState(0);
  const [initialCategory, setInitialCategory] = useState<ListingCategory | undefined>(undefined);

  // "Add experience" deep-links here with ?type=experience — start on that path.
  useEffect(() => {
    const type = new URLSearchParams(window.location.search).get("type");
    if (type === "experience") setInitialCategory("experience");
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
      setHostId(json.host.id);
      setNeedsHost(false);
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
      <div className="mx-auto max-w-lg">
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span className="uppercase tracking-wide text-[#800020]">Host setup</span>
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
                className="h-11 flex-1 rounded-full bg-[#800020] font-bold hover:bg-[#600018]"
              >
                Continue
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => createHost()}
                disabled={creatingHost}
                className="h-11 flex-1 rounded-full bg-[#800020] font-bold hover:bg-[#600018]"
              >
                {creatingHost ? "Creating..." : "Create host profile"}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <ListingForm hostId={hostId!} isAdmin={isAdmin} initialCategory={initialCategory} />;
}
