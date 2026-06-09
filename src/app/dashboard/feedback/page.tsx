"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/empty-state";
import type { Feedback } from "@/lib/types";

type FeedbackRow = Feedback & {
  booking?: {
    booking_token?: string;
    guest_name?: string;
    listing?: { name?: string; title?: string };
  };
};

export default function FeedbackPage() {
  const supabase = createClient();
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("feedback")
        .select("*, booking:bookings(booking_token, guest_name, listing:listings(name, title))")
        .order("created_at", { ascending: false });
      setFeedback((data as FeedbackRow[]) ?? []);
    }
    load();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Feedback</h1>
      <div className="border rounded-lg divide-y">
        {feedback.length === 0 ? (
          <EmptyState
            image="https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029367/empty-feedback_z8pn8q.png"
            title="No feedback yet"
            subtitle="Guest feedback after stays will appear here."
            size="sm"
          />
        ) : (
          feedback.map((item) => (
            <div key={item.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {item.booking?.listing?.title || item.booking?.listing?.name || "Booking"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.booking?.guest_name} · {item.booking?.booking_token}
                  </p>
                </div>
                <span className={item.rating <= 2 ? "text-red-600 font-semibold" : "font-semibold"}>
                  {item.rating}/5
                </span>
              </div>
              {item.comment && <p className="text-sm text-muted-foreground mt-2">{item.comment}</p>}
              {item.issue_reported && (
                <p className="text-xs text-red-600 mt-2">Issue reported: {item.issue_type || "General"}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
