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
