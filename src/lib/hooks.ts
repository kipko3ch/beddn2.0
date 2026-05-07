import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/routes";
import type { User } from "@supabase/supabase-js";

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data.user);
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  return { user, loading };
}

export function useSavedListings() {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loadingSaved, setLoadingSaved] = useState(true);
  const supabase = useMemo(() => createClient(), []);
  const { user, loading: loadingUser } = useUser();

  useEffect(() => {
    if (loadingUser) return;
    if (!user) {
      setSavedIds(new Set());
      setLoadingSaved(false);
      return;
    }

    let mounted = true;
    setLoadingSaved(true);
    supabase
      .from("saved_trips")
      .select("listing_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (!mounted) return;
        setSavedIds(new Set((data ?? []).map((item: { listing_id: string }) => item.listing_id)));
        setLoadingSaved(false);
      });

    return () => {
      mounted = false;
    };
  }, [loadingUser, supabase, user]);

  const signInToSave = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${ROUTES.home}` },
    });
  }, [supabase.auth]);

  const toggle = useCallback(
    async (listingId: string) => {
      if (!user) {
        await signInToSave();
        return { ok: false, reason: "auth" as const };
      }

      const wasSaved = savedIds.has(listingId);
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.delete(listingId);
        else next.add(listingId);
        return next;
      });

      const { error } = wasSaved
        ? await supabase
            .from("saved_trips")
            .delete()
            .eq("user_id", user.id)
            .eq("listing_id", listingId)
        : await supabase
            .from("saved_trips")
            .upsert({ user_id: user.id, listing_id: listingId }, { onConflict: "user_id,listing_id" });

      if (error) {
        setSavedIds((prev) => {
          const next = new Set(prev);
          if (wasSaved) next.add(listingId);
          else next.delete(listingId);
          return next;
        });
        return { ok: false, reason: "error" as const, error };
      }

      return { ok: true as const, saved: !wasSaved };
    },
    [savedIds, signInToSave, supabase, user]
  );

  return { savedIds, toggle, loadingSaved, user };
}
