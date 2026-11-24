import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { championsQueryOptions } from "@/lib/champions";
import { POSITIONS } from "@/lib/constants";
import type { DraftBan, DraftPick, DraftSide } from "@/lib/draft";
import { useI18n } from "@/i18n";
import { ChampionCombobox, type ChampionChoice } from "./ChampionCombobox";

export function DraftEditor({ picks, bans, onPicksChange, onBansChange }: { picks: DraftPick[]; bans: DraftBan[]; onPicksChange: (picks: DraftPick[]) => void; onBansChange: (bans: DraftBan[]) => void }) {
  const { t } = useI18n();
  const catalog = useQuery(championsQueryOptions);
  const champions = catalog.data?.champions ?? [];

  function setPick(side: DraftSide, position: (typeof POSITIONS)[number], order: number, champion: ChampionChoice | null) {
    const others = picks.filter((pick) => !(pick.side === side && pick.position === position));
    onPicksChange(champion ? [...others, { champion_id: champion.id, champion_name: champion.name, side, position, order }] : others);
  }

  function setBan(side: DraftSide, order: number, champion: ChampionChoice | null) {
    const others = bans.filter((ban) => !(ban.side === side && ban.order === order));
    onBansChange(champion ? [...others, { champion_id: champion.id, champion_name: champion.name, side, order }] : others);
  }

  return (
    <div className="rounded-md border border-border bg-surface/50 p-3 sm:col-span-2">
      <div className="mb-4"><p className="eyebrow text-foreground">{t("draft.picksAndBans")}</p><p className="mt-1 text-xs text-muted-foreground">{t("draft.picksHint")}</p></div>
      {catalog.isLoading ? <div className="flex justify-center py-6"><Loader2 className="animate-spin text-muted-foreground" /></div> : catalog.isError ? <p className="py-4 text-center text-sm text-destructive">{t("champ.loadError")}</p> : (
        <div className="grid gap-5 lg:grid-cols-2">
          {(["ZILENCE", "OPPONENT"] as const).map((side) => (
            <section key={side} className="rounded-md border border-border bg-background p-3">
              <h4 className="font-display text-lg font-semibold uppercase">{side === "ZILENCE" ? "ZILENCE" : t("draft.opponent")}</h4>
              <p className="eyebrow mb-2 mt-4">{t("draft.picks")}</p>
              <div className="space-y-2">{POSITIONS.map((position, index) => {
                const pick = picks.find((item) => item.side === side && item.position === position);
                return <div key={position} className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-2"><span className="font-display text-xs font-semibold tracking-wider text-muted-foreground">{position}</span><ChampionCombobox champions={champions} version={catalog.data?.version} value={pick ? { id: pick.champion_id, name: pick.champion_name } : null} onChange={(champion) => setPick(side, position, index + 1, champion)} /></div>;
              })}</div>
              <p className="eyebrow mb-2 mt-4">{t("draft.bans")}</p>
              <div className="space-y-2">{[1, 2, 3, 4, 5].map((order) => {
                const ban = bans.find((item) => item.side === side && item.order === order);
                return <div key={order} className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-2"><span className="font-display text-xs font-semibold tracking-wider text-muted-foreground">BAN {order}</span><ChampionCombobox champions={champions} version={catalog.data?.version} value={ban ? { id: ban.champion_id, name: ban.champion_name } : null} onChange={(champion) => setBan(side, order, champion)} /></div>;
              })}</div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
