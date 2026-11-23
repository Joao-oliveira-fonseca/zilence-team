import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
type Enums = Database["public"]["Enums"];

export type CoachNote = Tables["coach_notes"]["Row"];
export type VodReview = Tables["vod_reviews"]["Row"];
export type VodTimestamp = Tables["vod_timestamps"]["Row"];
export type DraftAnalysis = Tables["draft_analyses"]["Row"];
export type CoachNoteCategory = Enums["coach_note_category"];
export type VodCategory = Enums["vod_category"];

export const COACH_NOTE_CATEGORIES: CoachNoteCategory[] = [
  "player_notes",
  "individual_performance",
  "scrim_analysis",
  "draft_analysis",
  "team_strategy",
  "mental_behavior",
  "general_notes",
];

export const VOD_CATEGORIES: VodCategory[] = [
  "macro",
  "micro",
  "teamfight",
  "positioning",
  "draft",
  "objectives",
  "communication",
  "other",
];

export function formatTimestamp(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${minutes}:${String(remainder).padStart(2, "0")}`;
}

/** Accepts MM:SS or HH:MM:SS and returns null for invalid timestamps. */
export function parseTimestamp(value: string): number | null {
  const match = value.trim().match(/^(?:(\d+):)?([0-5]?\d):([0-5]\d)$/);
  if (!match) return null;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const total = hours * 3600 + minutes * 60 + seconds;
  return total <= 604800 ? total : null;
}

export function safeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function youtubeId(value: string): string | null {
  const safe = safeHttpUrl(value);
  if (!safe) return null;
  const url = new URL(safe);
  const host = url.hostname.replace(/^www\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.split("/").filter(Boolean)[0] ?? null;
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    id = url.searchParams.get("v");
    if (!id) {
      const parts = url.pathname.split("/").filter(Boolean);
      if (["embed", "shorts", "live"].includes(parts[0] ?? "")) id = parts[1] ?? null;
    }
  }
  return id && /^[\w-]{6,20}$/.test(id) ? id : null;
}

export function youtubeEmbedUrl(value: string, seconds = 0): string | null {
  const id = youtubeId(value);
  return id ? `https://www.youtube-nocookie.com/embed/${id}?start=${Math.max(0, seconds)}&rel=0` : null;
}

export function isNativeVideoUrl(value: string): boolean {
  const safe = safeHttpUrl(value);
  return safe ? /\.(mp4|webm|ogg)(?:$|\?)/i.test(safe) : false;
}

export function videoAtTimestamp(value: string, seconds: number): string {
  const safe = safeHttpUrl(value) ?? value;
  const id = youtubeId(safe);
  if (id) return `https://www.youtube.com/watch?v=${id}&t=${Math.max(0, seconds)}s`;
  return `${safe.split("#")[0]}#t=${Math.max(0, seconds)}`;
}
