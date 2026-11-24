import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { championsQueryOptions, iconFor } from "@/lib/champions";
import { POSITIONS } from "@/lib/constants";
import { parseDraftBans, parseDraftPicks, type DraftSide } from "@/lib/draft";
import type { ScrimGame } from "@/lib/operations";
import { useI18n } from "@/i18n";

export function GameDraftView({ game, opponent }: { game: ScrimGame; opponent: string }) {
  const { t } = useI18n();
  const catalog = useQuery(championsQueryOptions);
  const picks = parseDraftPicks(game.picks);
  const bans = parseDraftBans(game.bans);
  if (picks.length === 0 && bans.length === 0) return null;

  return (
    <div className="mt-3 grid gap-3 lg:grid-cols-2">
      {(["ZILENCE", "OPPONENT"] as const).map((side: DraftSide) => {
        const sidePicks = picks.filter((pick) => pick.side === side);
        const sideBans = bans.filter((ban) => ban.side === side).sort((a, b) => a.order - b.order);
        if (sidePicks.length === 0 && sideBans.length === 0) return null;
        return <section key={side} className="rounded-md border border-border bg-background p-3"><div className="flex items-center justify-between"><p className="eyebrow text-foreground">{side === "ZILENCE" ? "ZILENCE" : opponent}</p><Badge variant="muted">{sidePicks.length}P · {sideBans.length}B</Badge></div>{sidePicks.length > 0 && <div className="mt-3 space-y-1.5">{POSITIONS.map((position) => {
          const pick = sidePicks.find((item) => item.position === position);
          if (!pick) return null;
          return <div key={position} className="flex items-center gap-2 text-xs"><span className="w-16 font-display tracking-wider text-muted-foreground">{position}</span><img src={iconFor(pick.champion_id, catalog.data?.version)} alt="" className="size-6 rounded" width={24} height={24} /><span>{pick.champion_name}</span></div>;
        })}</div>}{sideBans.length > 0 && <div className="mt-3 border-t border-border pt-2"><p className="eyebrow text-[10px]">{t("draft.bans")}</p><div className="mt-2 flex flex-wrap gap-2">{sideBans.map((ban) => <span key={`${ban.side}-${ban.order}`} className="flex items-center gap-1.5 rounded bg-surface px-2 py-1 text-xs text-muted-foreground" title={ban.champion_name}><img src={iconFor(ban.champion_id, catalog.data?.version)} alt="" className="size-5 rounded-sm" width={20} height={20} />{ban.champion_name}</span>)}</div></div>}</section>;
      })}
    </div>
  );
}
