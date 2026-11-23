import { queryOptions } from "@tanstack/react-query";
import type { Position } from "./constants";

export type Champion = { id: string; name: string; icon: string; positions: Position[] };
type MerakiPosition = "TOP" | "JUNGLE" | "MIDDLE" | "BOTTOM" | "SUPPORT";
const ALL: Position[] = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];

export function positionsFromMeraki(positions: MerakiPosition[]): Position[] {
  return positions.map((position) => position === "MIDDLE" ? "MID" : position === "BOTTOM" ? "ADC" : position);
}

export const championsQueryOptions = queryOptions({
  queryKey: ["ddragon", "champions", "all-positions"],
  staleTime: 24 * 60 * 60 * 1000,
  queryFn: async (): Promise<{ version: string; champions: Champion[] }> => {
    const versions = (await (await fetch("https://ddragon.leagueoflegends.com/api/versions.json")).json()) as string[];
    const version = versions[0]!;
    const res = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/pt_BR/champion.json`);
    if (!res.ok) throw new Error(`ddragon ${res.status}`);
    const json = (await res.json()) as { data: Record<string, { id: string; name: string }> };
    const champions = Object.values(json.data)
      .map((champion) => {
        return {
          id: champion.id,
          name: champion.name,
          icon: championIcon(version, champion.id),
          positions: ALL,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    return { version, champions };
  },
});

export function championIcon(version: string, id: string) {
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${id}.png`;
}

/** Icon URL for a stored champion id; uses a recent patch when the live version isn't loaded yet. */
export function iconFor(id: string, version?: string) {
  return championIcon(version ?? "15.1.1", id);
}
