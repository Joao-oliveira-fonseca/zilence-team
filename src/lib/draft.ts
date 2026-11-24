import type { Json } from "@/integrations/supabase/types";
import { POSITIONS, type Position } from "@/lib/constants";
import type { ScrimGame, ScrimSession } from "@/lib/operations";

export type DraftSide = "ZILENCE" | "OPPONENT";
export type DraftPick = {
  champion_id: string;
  champion_name: string;
  side: DraftSide;
  position: Position;
  order: number;
};
export type DraftBan = {
  champion_id: string;
  champion_name: string;
  side: DraftSide;
  order: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isPosition = (value: unknown): value is Position => typeof value === "string" && (POSITIONS as string[]).includes(value);
const isSide = (value: unknown): value is DraftSide => value === "ZILENCE" || value === "OPPONENT";

export function parseDraftPicks(value: Json): DraftPick[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, index) => {
    if (!isRecord(entry) || typeof entry["champion_id"] !== "string" || typeof entry["champion_name"] !== "string" || !isSide(entry["side"]) || !isPosition(entry["position"])) return [];
    return [{
      champion_id: entry["champion_id"],
      champion_name: entry["champion_name"],
      side: entry["side"],
      position: entry["position"],
      order: typeof entry["order"] === "number" ? entry["order"] : index + 1,
    }];
  });
}

export function parseDraftBans(value: Json): DraftBan[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, index) => {
    if (!isRecord(entry) || typeof entry["champion_id"] !== "string" || typeof entry["champion_name"] !== "string" || !isSide(entry["side"])) return [];
    return [{
      champion_id: entry["champion_id"],
      champion_name: entry["champion_name"],
      side: entry["side"],
      order: typeof entry["order"] === "number" ? entry["order"] : index + 1,
    }];
  });
}

export type DraftHistoryEntry = {
  key: string;
  pick: DraftPick;
  gameId: string;
  gameNumber: number;
  result: ScrimGame["result"];
  opponent: string;
  startsAt: string;
};

export type DraftHistorySummary = {
  key: string;
  championId: string;
  championName: string;
  position: Position;
  picks: number;
  wins: number;
  losses: number;
  winRate: number | null;
  lastPlayed: string;
};

export function draftHistory(games: ScrimGame[], sessions: ScrimSession[]) {
  const sessionMap = new Map(sessions.map((session) => [session.id, session]));
  const entries = games.flatMap((game): DraftHistoryEntry[] => {
    const session = sessionMap.get(game.session_id);
    if (!session) return [];
    return parseDraftPicks(game.picks)
      .filter((pick) => pick.side === "ZILENCE")
      .map((pick) => ({
        key: `${game.id}-${pick.side}-${pick.position}`,
        pick,
        gameId: game.id,
        gameNumber: game.game_number,
        result: game.result,
        opponent: session.opponent,
        startsAt: session.starts_at,
      }));
  }).sort((a, b) => b.startsAt.localeCompare(a.startsAt));

  const summaries = new Map<string, DraftHistorySummary>();
  for (const entry of entries) {
    const key = `${entry.pick.position}:${entry.pick.champion_id}`;
    const current = summaries.get(key) ?? {
      key,
      championId: entry.pick.champion_id,
      championName: entry.pick.champion_name,
      position: entry.pick.position,
      picks: 0,
      wins: 0,
      losses: 0,
      winRate: null,
      lastPlayed: entry.startsAt,
    };
    current.picks += 1;
    if (entry.result === "WIN") current.wins += 1;
    if (entry.result === "LOSS") current.losses += 1;
    if (entry.startsAt > current.lastPlayed) current.lastPlayed = entry.startsAt;
    summaries.set(key, current);
  }
  for (const summary of summaries.values()) {
    const played = summary.wins + summary.losses;
    summary.winRate = played ? Math.round((summary.wins / played) * 100) : null;
  }
  return {
    entries,
    summaries: [...summaries.values()].sort((a, b) => b.picks - a.picks || a.championName.localeCompare(b.championName)),
  };
}
