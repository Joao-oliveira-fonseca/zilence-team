import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "role.coach_added"
  | "role.coach_removed"
  | "account.player_linked"
  | "account.invited"
  | "team.settings_updated";

export type AuditEntryInput = {
  action: AuditAction;
  entityType: "user" | "player" | "team_settings";
  entityId?: string | null;
  entityLabel?: string | null;
  details?: Record<string, string | number | boolean | null>;
};

/**
 * Records one audit entry for the signed-in coach.
 * Never throws: a failed audit write must not break the action that triggered it.
 */
export async function writeAuditEntry(input: AuditEntryInput) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, email")
      .eq("id", user.id)
      .maybeSingle();

    const actorName = profile?.display_name ?? profile?.email ?? user.email ?? "—";

    const { error } = await supabase.from("audit_log").insert({
      actor_id: user.id,
      actor_name: actorName,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      entity_label: input.entityLabel ?? null,
      details: input.details ?? {},
    });

    if (error) console.warn("audit_log insert failed:", error.message);
  } catch (error) {
    console.warn("audit_log insert failed:", error);
  }
}
