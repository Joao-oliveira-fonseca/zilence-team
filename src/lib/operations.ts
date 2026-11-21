import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
type Enums = Database["public"]["Enums"];

export type CalendarEvent = Omit<Tables["calendar_events"]["Row"], "coach_notes">;
export type ScrimSession = Tables["scrim_sessions"]["Row"];
export type ScrimGame = Tables["scrim_games"]["Row"];
export type TeamTask = Tables["team_tasks"]["Row"];
export type ScrimType = Enums["scrim_type"];
export type TaskCategory = Enums["task_category"];

export const DEFAULT_TIMEZONE = "America/Sao_Paulo";
export const TIMEZONES = ["America/Sao_Paulo", "America/Argentina/Buenos_Aires", "America/Santiago", "America/Montevideo", "Europe/Madrid", "UTC"] as const;
export const EVENT_TYPES: Enums["event_type"][] = ["championship", "official_match", "scrim", "training", "team_meeting", "draft_review", "other"];
export const SCRIM_TYPES: ScrimType[] = ["BO3", "BO5", "SOLO_GAME", "TEAM_PRACTICE", "DRAFT_PRACTICE"];
export const TASK_CATEGORIES: TaskCategory[] = ["individual_training", "champion_study", "vod_review", "macro_study", "mechanics", "team_objective", "other"];
export const TASK_PRIORITIES: Enums["task_priority"][] = ["low", "medium", "high", "urgent"];

const part = (parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "0";

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return {
    year: Number(part(parts, "year")),
    month: Number(part(parts, "month")),
    day: Number(part(parts, "day")),
    hour: Number(part(parts, "hour")),
    minute: Number(part(parts, "minute")),
  };
}

/** Converts a wall-clock date and time in the chosen timezone to a UTC ISO string. */
export function zonedDateTimeToIso(date: string, time: string, timeZone: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  if (!year || !month || !day || hour === undefined || minute === undefined) throw new Error("Invalid date/time");
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let timestamp = target;
  for (let i = 0; i < 3; i += 1) {
    const actual = zonedParts(new Date(timestamp), timeZone);
    const represented = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute);
    const adjustment = target - represented;
    timestamp += adjustment;
    if (adjustment === 0) break;
  }
  return new Date(timestamp).toISOString();
}

export function isoToZonedInputs(iso: string, timeZone: string): { date: string; time: string } {
  const p = zonedParts(new Date(iso), timeZone);
  return {
    date: `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`,
    time: `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`,
  };
}

export function eventDateKey(iso: string, timeZone: string): string {
  return isoToZonedInputs(iso, timeZone).date;
}

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function addMinutesIso(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

export function formatZonedDate(iso: string, timeZone: string, locale: string, includeTime = true): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(iso));
}

export function scrimStats(sessions: Pick<ScrimSession, "id" | "opponent">[], games: Pick<ScrimGame, "result">[]) {
  const wins = games.filter((g) => g.result === "WIN").length;
  const losses = games.filter((g) => g.result === "LOSS").length;
  const played = wins + losses;
  return {
    wins,
    losses,
    winRate: played === 0 ? null : (wins / played) * 100,
    sessions: sessions.length,
    opponents: new Set(sessions.map((s) => s.opponent.trim().toLowerCase())).size,
  };
}

export function sessionRecord(games: Pick<ScrimGame, "session_id" | "result">[], sessionId: string) {
  const own = games.filter((g) => g.session_id === sessionId);
  return {
    wins: own.filter((g) => g.result === "WIN").length,
    losses: own.filter((g) => g.result === "LOSS").length,
  };
}

export function scrimEvolution(sessions: ScrimSession[], games: ScrimGame[]) {
  let wins = 0;
  let played = 0;
  return [...sessions]
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .flatMap((session) => {
      const record = sessionRecord(games, session.id);
      wins += record.wins;
      played += record.wins + record.losses;
      if (played === 0 || record.wins + record.losses === 0) return [];
      return [{ opponent: session.opponent, winRate: Math.round((wins / played) * 100) }];
    });
}

export function compositionList(value: string): string[] {
  return [...new Set(value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean))].slice(0, 5);
}
