import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const playersQueryOptions = queryOptions({
  queryKey: ["players"],
  queryFn: async () => {
    const { data, error } = await supabase.from("players").select("*").order("main_position").order("nickname");
    if (error) throw error;
    return data;
  },
});

export const upcomingEventsQueryOptions = queryOptions({
  queryKey: ["events", "upcoming"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("calendar_events")
      .select("id, title, event_type, starts_at, ends_at, timezone, location")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at")
      .limit(8);
    if (error) throw error;
    return data;
  },
});

export const calendarEventsQueryOptions = queryOptions({
  queryKey: ["calendar-events"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("calendar_events")
      .select("id, title, event_type, description, starts_at, ends_at, timezone, location, external_link, related_player_id, participant_ids, visibility, created_by, created_at, updated_at, scrim_session_id")
      .order("starts_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const eventPrivateNotesQueryOptions = queryOptions({
  queryKey: ["event-private-notes"],
  queryFn: async () => {
    const { data, error } = await supabase.from("calendar_event_private_notes").select("*");
    if (error) throw error;
    return data;
  },
});

export const scrimSessionsQueryOptions = queryOptions({
  queryKey: ["scrim-sessions"],
  queryFn: async () => {
    const { data, error } = await supabase.from("scrim_sessions").select("*").order("starts_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const scrimGamesQueryOptions = queryOptions({
  queryKey: ["scrim-games"],
  queryFn: async () => {
    const { data, error } = await supabase.from("scrim_games").select("*").order("game_number");
    if (error) throw error;
    return data;
  },
});

export const scrimPrivateNotesQueryOptions = queryOptions({
  queryKey: ["scrim-private-notes"],
  queryFn: async () => {
    const { data, error } = await supabase.from("scrim_private_notes").select("*");
    if (error) throw error;
    return data;
  },
});

export const tasksQueryOptions = queryOptions({
  queryKey: ["tasks"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("team_tasks")
      .select("*")
      .order("due_at", { ascending: true, nullsFirst: false });
    if (error) throw error;
    return data;
  },
});

export const pendingAccountsQueryOptions = queryOptions({
  queryKey: ["pending-accounts"],
  queryFn: async () => {
    const { data, error } = await supabase.rpc("pending_accounts");
    if (error) throw error;
    return data ?? [];
  },
});

export const evaluationsQueryOptions = (playerId: string) =>
  queryOptions({
    queryKey: ["evaluations", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_evaluations")
        .select("*")
        .eq("player_id", playerId)
        .order("evaluated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const championPoolQueryOptions = (playerId: string) =>
  queryOptions({
    queryKey: ["champion-pool", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("champion_pool")
        .select("*")
        .eq("player_id", playerId)
        .order("rating", { ascending: false })
        .order("champion_name");
      if (error) throw error;
      return data;
    },
  });

export const coachNotesQueryOptions = queryOptions({
  queryKey: ["coach-notes"],
  queryFn: async () => {
    const { data, error } = await supabase.from("coach_notes").select("*").order("pinned", { ascending: false }).order("updated_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const vodReviewsQueryOptions = queryOptions({
  queryKey: ["vod-reviews"],
  queryFn: async () => {
    const { data, error } = await supabase.from("vod_reviews").select("*").order("review_date", { ascending: false }).order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const vodTimestampsQueryOptions = queryOptions({
  queryKey: ["vod-timestamps"],
  queryFn: async () => {
    const { data, error } = await supabase.from("vod_timestamps").select("*").order("seconds");
    if (error) throw error;
    return data;
  },
});

export const draftAnalysesQueryOptions = queryOptions({
  queryKey: ["draft-analyses"],
  queryFn: async () => {
    const { data, error } = await supabase.from("draft_analyses").select("*").order("analysis_date", { ascending: false }).order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const recentEvaluationsQueryOptions = queryOptions({
  queryKey: ["evaluations", "recent"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("player_evaluations")
      .select("id, player_id, overall, evaluated_at, coach_name")
      .order("evaluated_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data;
  },
});

export const teamSettingsQueryOptions = queryOptions({
  queryKey: ["team-settings"],
  queryFn: async () => {
    const { data, error } = await supabase.from("team_settings").select("*").eq("id", 1).single();
    if (error) throw error;
    return data;
  },
});

export const profilesQueryOptions = queryOptions({
  queryKey: ["profiles"],
  queryFn: async () => {
    const { data, error } = await supabase.from("profiles").select("*").order("display_name");
    if (error) throw error;
    return data;
  },
});

export const userRolesQueryOptions = queryOptions({
  queryKey: ["user-roles"],
  queryFn: async () => {
    const { data, error } = await supabase.from("user_roles").select("*");
    if (error) throw error;
    return data;
  },
});

export const notificationsQueryOptions = queryOptions({
  queryKey: ["notifications"],
  queryFn: async () => {
    const { error: syncError } = await supabase.rpc("sync_task_deadline_notifications");
    if (syncError) throw syncError;
    const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    return data;
  },
  staleTime: 30_000,
  refetchInterval: 60_000,
});
