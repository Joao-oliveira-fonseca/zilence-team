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

export const tasksQueryOptions = queryOptions({
  queryKey: ["tasks"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("team_tasks")
      .select("id, title, status, priority, due_at, player_id, category")
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
