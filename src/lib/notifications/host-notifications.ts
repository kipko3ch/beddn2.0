import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/server";
import type { HostNotificationType } from "@/lib/types";

export interface CreateHostNotificationParams {
  hostId: string;
  userId?: string | null;
  type: HostNotificationType;
  title: string;
  message: string;
  link?: string | null;
  metadata?: Record<string, unknown>;
  emailNotification?: {
    subject: string;
    html: string;
  };
}

/**
 * Creates an in-app notification for a host and optionally sends an email copy.
 * Safe and best-effort: failures never crash callers.
 */
export async function createHostNotification(params: CreateHostNotificationParams): Promise<void> {
  const admin = createAdminClient();

  try {
    // 1. In-app notification insert
    await admin.from("host_notifications").insert({
      host_id: params.hostId,
      user_id: params.userId ?? null,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link ?? null,
      metadata: params.metadata ?? {},
      is_read: false,
    });
  } catch (err) {
    console.warn("Failed to insert in-app host notification (table might be missing):", err);
  }

  // 2. Email notification (if supplied)
  if (params.emailNotification) {
    try {
      let recipientEmail = "";
      if (params.userId) {
        const { data } = await admin.auth.admin.getUserById(params.userId);
        recipientEmail = data?.user?.email || "";
      }
      if (!recipientEmail && params.hostId) {
        const { data: host } = await admin.from("hosts").select("user_id").eq("id", params.hostId).maybeSingle();
        if (host?.user_id) {
          const { data } = await admin.auth.admin.getUserById(host.user_id);
          recipientEmail = data?.user?.email || "";
        }
      }

      if (recipientEmail) {
        await sendEmail({
          to: recipientEmail,
          subject: params.emailNotification.subject,
          html: params.emailNotification.html,
          eventType: params.type,
        });
      }
    } catch (err) {
      console.warn("Failed to deliver host notification email:", err);
    }
  }
}
