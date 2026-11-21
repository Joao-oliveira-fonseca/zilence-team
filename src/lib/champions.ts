import { queryOptions } from "@tanstack/react-query";
import type { Position } from "./constants";

export type Champion = { id: string; name: string; icon: string; positions: Position[] };

// Usual positions per champion (Data Dragon has no role data). Unknown champions fall back to all roles.
const ROLE_MAP: Record<Position, string> = {
  TOP: "Aatrox Akali Ambessa Camille ChoGath Darius DrMundo Fiora Gangplank Garen Gnar Gragas Gwen Illaoi Irelia Jax Jayce KSante Kayle Kennen Kled Malphite Mordekaiser Nasus Olaf Ornn Pantheon Poppy Quinn Renekton Riven Rumble Sett Shen Singed Sion Teemo Trundle Tryndamere Urgot Vayne Volibear Warwick MonkeyKing Yasuo Yone Yorick Zac Yorick Gragas Kennen Heimerdinger Vladimir Sylas Smolder Aurora Ryze Cassiopeia Tahm TahmKench Udyr Kayle Zaahen",
  JUNGLE: "Amumu Belveth Briar Diana Ekko Elise Evelynn Fiddlesticks Gragas Graves Hecarim Ivern JarvanIV Jax Karthus Kayn Khazix Kindred LeeSin Lillia MasterYi Nidale Nidalee Nocturne Nunu Olaf Poppy Rammus RekSai Rengar Sejuani Shaco Shyvana Skarner Taliyah Talon Trundle Udyr Vi Viego Volibear Warwick MonkeyKing XinZhao Zac Zed Naafiri Gwen Wukong",
  MID: "Ahri Akali Akshan Anivia Annie AurelionSol Aurora Azir Cassiopeia Corki Diana Ekko Fizz Galio Hwei Irelia Kassadin Katarina LeBlanc Lissandra Lux Malzahar Mel Naafiri Neeko Orianna Qiyana Ryze Sylas Syndra Taliyah Talon TwistedFate Veigar Vex Viktor Vladimir Xerath Yasuo Yone Zed Ziggs Zoe Kayle Smolder Tristana Akshan Pantheon Swain Lucian",
  ADC: "Aphelios Ashe Caitlyn Draven Ezreal Jhin Jinx Kaisa Kalista KogMaw Lucian MissFortune Nilah Samira Senna Sivir Smolder Tristana Twitch Varus Vayne Xayah Zeri Ziggs Yasuo Seraphine Karthus Swain Corki",
  SUPPORT: "Alistar Bard Blitzcrank Brand Braum Janna Karma Leona Lulu Lux Maokai Milio Morgana Nami Nautilus Neeko Pantheon Poppy Pyke Rakan Rell Renata Senna Seraphine Sona Soraka Swain TahmKench Taric Thresh Velkoz Xerath Yuumi Zilean Zyra Zoe Hwei Elise Shaco Camille Galio Mel",
};

const roleIndex = new Map<string, Position[]>();
for (const [pos, list] of Object.entries(ROLE_MAP) as [Position, string][]) {
  for (const id of list.split(/\s+/)) {
    const cur = roleIndex.get(id) ?? [];
    if (!cur.includes(pos)) roleIndex.set(id, [...cur, pos]);
  }
}

const ALL: Position[] = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];

export const championsQueryOptions = queryOptions({
  queryKey: ["ddragon", "champions"],
  staleTime: 24 * 60 * 60 * 1000,
  queryFn: async (): Promise<{ version: string; champions: Champion[] }> => {
    const versions = (await (await fetch("https://ddragon.leagueoflegends.com/api/versions.json")).json()) as string[];
    const version = versions[0]!;
    const res = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/pt_BR/champion.json`);
    if (!res.ok) throw new Error(`ddragon ${res.status}`);
    const json = (await res.json()) as { data: Record<string, { id: string; name: string }> };
    const champions = Object.values(json.data)
      .map((c) => ({
        id: c.id,
        name: c.name,
        icon: championIcon(version, c.id),
        positions: roleIndex.get(c.id) ?? ALL,
      }))
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
