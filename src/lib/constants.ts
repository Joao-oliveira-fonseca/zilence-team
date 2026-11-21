import type { Database } from "@/integrations/supabase/types";

type Enums = Database["public"]["Enums"];
export type Position = Enums["lol_position"];
export type PlayerStatus = Enums["player_status"];
export type EventType = Enums["event_type"];
export type TaskStatus = Enums["task_status"];
export type TaskPriority = Enums["task_priority"];

export const POSITIONS: Position[] = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];
export const PLAYER_STATUSES: PlayerStatus[] = ["active", "substitute", "trial", "inactive"];
export const TASK_STATUSES: TaskStatus[] = ["pending", "in_progress", "completed", "overdue"];
export const EDITABLE_TASK_STATUSES: TaskStatus[] = ["pending", "in_progress", "completed"];

export const ELO_TIERS = [
  "Iron",
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Emerald",
  "Diamond",
  "Master",
  "Grandmaster",
  "Challenger",
] as const;

export const REGIONS = ["BR", "LAN", "LAS", "NA", "EUW", "EUNE", "KR", "OCE", "JP", "TR", "RU"] as const;

/** Tier part of an elo string such as "Diamond II" → "Diamond". */
export function eloTier(elo: string | null | undefined): string | null {
  if (!elo) return null;
  const found = ELO_TIERS.find((tier) => elo.toLowerCase().startsWith(tier.toLowerCase()));
  return found ?? null;
}

/** A task past its deadline that is not completed counts as overdue, whatever its stored status. */
export function effectiveTaskStatus(task: { status: TaskStatus; due_at: string | null }, now = new Date()): TaskStatus {
  if (task.status === "completed") return "completed";
  if (task.due_at && new Date(task.due_at).getTime() < now.getTime()) return "overdue";
  return task.status;
}
