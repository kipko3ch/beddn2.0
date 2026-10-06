import { createAdminClient } from "@/lib/supabase/admin";

export interface RecordAuditLogInput {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
}

/**
 * Persists an audit log entry.
 * Safe and non-throwing: logs errors to console without interrupting core operations.
 */
export async function recordAuditLog(input: RecordAuditLogInput): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("audit_logs").insert({
      actor_id: input.actorId || null,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      details: input.details ?? {},
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to record audit log:", input.action, err);
  }
}
