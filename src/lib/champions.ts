import { queryOptions } from "@tanstack/react-query";
import type { Position } from "./constants";

export type Champion = { id: string; name: string; icon: string; positions: Position[] };
type MerakiPosition = "TOP" | "JUNGLE" | "MIDDLE" | "BOTTOM" | "SUPPORT";
type MerakiChampion = { key: string | number; positions: MerakiPosition[] };

// Recent champions not yet present in Meraki's role dataset.
const ROLE_OVERRIDES: Record<string, Position[]> = {
  Locke: ["MID", "JUNGLE"],
  Zaahen: ["TOP"],
};
const ALL: Position[] = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];

export function positionsFromMeraki(positions: MerakiPosition[]): Position[] {
  return positions.map((position) => position === "MIDDLE" ? "MID" : position === "BOTTOM" ? "ADC" : position);
}

export const championsQueryOptions = queryOptions({
  queryKey: ["ddragon", "champions", "meraki-positions"],
  staleTime: 24 * 60 * 60 * 1000,
  queryFn: async (): Promise<{ version: string; champions: Champion[] }> => {
    const versions = (await (await fetch("https://ddragon.leagueoflegends.com/api/versions.json")).json()) as string[];
    const version = versions[0]!;
    const [res, merakiRes] = await Promise.all([
      fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/pt_BR/champion.json`),
      fetch("https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions.json"),
    ]);
    if (!res.ok) throw new Error(`ddragon ${res.status}`);
    if (!merakiRes.ok) throw new Error(`meraki ${merakiRes.status}`);
    const json = (await res.json()) as { data: Record<string, { id: string; key: string; name: string; tags: string[] }> };
    const meraki = (await merakiRes.json()) as Record<string, MerakiChampion>;
    const positionsByKey = new Map(Object.values(meraki).map((champion) => [String(champion.key), positionsFromMeraki(champion.positions)]));
    const champions = Object.values(json.data)
      .map((champion) => {
        // Keep future champions selectable until the role dataset catches up.
        const fallback: Position[] = champion.tags.includes("Marksman") ? ["ADC"] : champion.tags.includes("Support") ? ["SUPPORT"] : ALL;
        return {
          id: champion.id,
          name: champion.name,
          icon: championIcon(version, champion.id),
          positions: ROLE_OVERRIDES[champion.id] ?? positionsByKey.get(champion.key) ?? fallback,
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
