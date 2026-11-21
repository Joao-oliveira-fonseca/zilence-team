import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Player = Database["public"]["Tables"]["players"]["Row"];

export type Member = {
  userId: string;
  email: string | null;
  profile: Profile | null;
  role: AppRole | null;
  player: Player | null;
};

/** The signed-in person: profile, role (coach wins over player) and linked player record. */
export const memberQueryOptions = queryOptions({
  queryKey: ["member"],
  queryFn: async (): Promise<Member | null> => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return null;

    const [profileRes, rolesRes, playerRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", user.id),
      supabase.from("players").select("*").eq("user_id", user.id).maybeSingle(),
    ]);

    const roles = (rolesRes.data ?? []).map((r) => r.role);
    const role: AppRole | null = roles.includes("coach") ? "coach" : roles.includes("player") ? "player" : null;

    return {
      userId: user.id,
      email: user.email ?? null,
      profile: profileRes.data ?? null,
      role,
      player: playerRes.data ?? null,
    };
  },
  staleTime: 60_000,
});

export function homePathFor(role: AppRole | null): "/overview" | "/dashboard" | "/home" {
  if (role === "coach") return "/overview";
  if (role === "player") return "/dashboard";
  return "/home";
}
