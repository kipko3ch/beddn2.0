import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, [supabase.auth]);

  return user;
}

export function useSavedListings() {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const supabase = useMemo(() => createClient(), []);
  const user = useUser();

  useEffect(() => {
    if (!user) return;
    supabase
      .from("saved_trips")
      .select("listing_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setSavedIds(new Set((data ?? []).map((item: { listing_id: string }) => item.listing_id)));
      });
  }, [supabase, user]);

  async function toggle(listingId: string) {
    if (!user) return;
    if (savedIds.has(listingId)) {
      await supabase
        .from("saved_trips")
        .delete()
        .eq("user_id", user.id)
        .eq("listing_id", listingId);
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(listingId);
        return next;
      });
    } else {
      await supabase
        .from("saved_trips")
        .insert({ user_id: user.id, listing_id: listingId });
      setSavedIds((prev) => new Set(prev).add(listingId));
    }
  }

  return { savedIds, toggle };
}
