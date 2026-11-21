import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inviteSchema = z.object({
  playerId: z.string().uuid(),
  email: z.string().trim().toLowerCase().email().max(255),
  redirectTo: z.string().url().max(500),
});

/** Coach-only: email an invite to a player and link the new account to the player record. */
export const invitePlayer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inviteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isCoach, error: roleError } = await context.supabase.rpc("is_coach", {
      _user_id: context.userId,
    });
    if (roleError || !isCoach) throw new Error("forbidden");

    // Reads through the coach's own session, so RLS confirms access to this player.
    const { data: player, error: playerError } = await context.supabase
      .from("players")
      .select("id, nickname, user_id")
      .eq("id", data.playerId)
      .maybeSingle();
    if (playerError || !player) throw new Error("player_not_found");
    if (player.user_id) throw new Error("already_linked");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let userId: string | null = null;
    let existing = false;
    const { data: invited, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      redirectTo: data.redirectTo,
      data: { display_name: player.nickname },
    });

    if (invited?.user) {
      userId = invited.user.id;
    } else {
      // The address may already have an account (e.g. signed in with Google before).
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .ilike("email", data.email)
        .maybeSingle();
      if (!profile) {
        console.error("Invite failed", inviteError?.status, inviteError?.message);
        throw new Error(inviteError?.message ?? "invite_failed");
      }
      userId = profile.id;
      existing = true;
    }

    const { data: coachRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "coach")
      .maybeSingle();
    if (coachRole) throw new Error("account_is_coach");

    const { data: otherLink } = await supabaseAdmin
      .from("players")
      .select("id")
      .eq("user_id", userId)
      .neq("id", player.id)
      .maybeSingle();
    if (otherLink) throw new Error("account_already_linked");

    const { error: linkError } = await supabaseAdmin.from("players").update({ user_id: userId }).eq("id", player.id);
    if (linkError) throw new Error(linkError.message);
    const { error: roleInsertError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "player" }, { onConflict: "user_id,role", ignoreDuplicates: true });
    if (roleInsertError) throw new Error(roleInsertError.message);

    return { existing };
  });
