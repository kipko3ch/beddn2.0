"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ListingForm } from "@/components/listing-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function NewListingPage() {
  const supabase = createClient();
  const [hostId, setHostId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [needsHost, setNeedsHost] = useState(false);

  const [hostName, setHostName] = useState("");
  const [hostPhone, setHostPhone] = useState("");
  const [creatingHost, setCreatingHost] = useState(false);

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
        .select("id")
        .eq("user_id", userData.user.id)
        .single();

      if (host) {
        setHostId(host.id);
      } else {
        setNeedsHost(true);
      }
      setLoading(false);
    }
    init();
  }, []);

  async function createHost(e: React.FormEvent) {
    e.preventDefault();
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
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">New listing</h1>
        <p className="text-muted-foreground mb-4">
          First, set up your host profile.
        </p>
        <form onSubmit={createHost} className="space-y-4 max-w-md">
          <div>
            <Label htmlFor="hostName">Host name *</Label>
            <Input
              id="hostName"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="hostPhone">Host phone *</Label>
            <Input
              id="hostPhone"
              type="tel"
              value={hostPhone}
              onChange={(e) => setHostPhone(e.target.value)}
              required
            />
          </div>
          <Button
            type="submit"
            disabled={creatingHost}
            className="bg-[#800020] hover:bg-[#600018]"
          >
            {creatingHost ? "Creating..." : "Continue"}
          </Button>
        </form>
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
