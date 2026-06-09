"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ListingForm } from "@/components/listing-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function NewListingPage() {
  const supabase = createClient();
  const [hostId, setHostId] = useState<string | null>(null);
  const [hostApproved, setHostApproved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [needsHost, setNeedsHost] = useState(false);

  const [hostName, setHostName] = useState("");
  const [hostPhone, setHostPhone] = useState("");
  const [creatingHost, setCreatingHost] = useState(false);
  const [step, setStep] = useState(0); // host application wizard step

  useEffect(() => {
    async function init() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", userData.user.id)
        .single();
      setIsAdmin(profile?.is_admin ?? false);

      const { data: host } = await supabase
        .from("hosts")
        .select("id, is_verified")
        .eq("user_id", userData.user.id)
        .single();

      if (host) {
        setHostId(host.id);
        setHostApproved(Boolean(host.is_verified));
      } else {
        setNeedsHost(true);
      }
      setLoading(false);
    }
    init();
  }, []);

  async function createHost(e?: React.FormEvent) {
    e?.preventDefault();
    setCreatingHost(true);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data, error } = await supabase
      .from("hosts")
      .insert({
        user_id: user.user.id,
        name: hostName,
        phone: hostPhone,
      })
      .select("id")
      .single();

    if (data) {
      setHostId(data.id);
      setHostApproved(false);
      setNeedsHost(false);
    } else {
      alert("Failed to create host profile: " + (error?.message ?? ""));
    }
    setCreatingHost(false);
  }

  if (loading) {
    return <div className="animate-pulse h-8 w-48 bg-muted rounded" />;
  }

  if (!hostId && !needsHost) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">New listing</h1>
        <p className="text-muted-foreground">
          Please sign in to create a listing.
        </p>
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
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span className="uppercase tracking-wide text-[#800020]">Become a host</span>
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
              <h1 className="text-2xl font-bold">What should guests call you?</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This is the name shown on your listings and to guests.
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
                placeholder="+254…"
                className="mt-5 h-12 text-base"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canNext) next();
                }}
              />
            </div>
          )}

          {step === 2 && (
            <div>
              <h1 className="text-2xl font-bold">Review &amp; submit</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                An admin reviews every host before listings go live — this keeps guests safe
                and your place trusted.
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

          {/* Controls */}
          <div className="mt-7 flex items-center gap-3">
            {step > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={back}
                className="h-11 rounded-full px-6"
              >
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
                {creatingHost ? "Submitting…" : "Submit application"}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (hostId && !hostApproved && !isAdmin) {
    return (
      <div className="max-w-xl rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold mb-3">Host approval pending</h1>
        <p className="text-muted-foreground">
          Your host profile has been submitted. An admin must verify your host account before
          you can create or publish listings on Beddn.
        </p>
        <div className="mt-5 rounded-xl bg-[#fbf7f8] p-4 text-sm text-muted-foreground">
          This keeps guests safer and makes sure only approved hosts can receive booking
          requests.
        </div>
        <div className="mt-4 rounded-xl border p-4 text-sm text-muted-foreground">
          Host approval lets you use host tools. A future Beddn Verified listing badge may
          require extra checks like photos, exact location review, and safety verification.
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">New listing</h1>
      <ListingForm hostId={hostId!} isAdmin={isAdmin} />
    </div>
  );
}
