import { useMemo, useState } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, StatCard } from "@/components/common/Page";
import { scrimGamesQueryOptions, scrimSessionsQueryOptions } from "@/lib/queries";
import { championsQueryOptions, iconFor } from "@/lib/champions";
import { POSITIONS } from "@/lib/constants";
import { draftHistory } from "@/lib/draft";
import { DEFAULT_TIMEZONE, formatZonedDate } from "@/lib/operations";
import { useI18n } from "@/i18n";

const ALL = "ALL";

export function DraftHistoryPanel() {
  const { t, locale } = useI18n();
  const { data: games } = useSuspenseQuery(scrimGamesQueryOptions);
  const { data: sessions } = useSuspenseQuery(scrimSessionsQueryOptions);
  const catalog = useQuery(championsQueryOptions);
  const [position, setPosition] = useState(ALL);
  const [champion, setChampion] = useState(ALL);
  const history = useMemo(() => draftHistory(games, sessions), [games, sessions]);
  const champions = useMemo(() => [...new Map(history.entries.map((entry) => [entry.pick.champion_id, entry.pick.champion_name])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [history.entries]);
  const entries = history.entries.filter((entry) => (position === ALL || entry.pick.position === position) && (champion === ALL || entry.pick.champion_id === champion));
  const summaries = history.summaries.filter((summary) => (position === ALL || summary.position === position) && (champion === ALL || summary.championId === champion));
  const wins = entries.filter((entry) => entry.result === "WIN").length;
  const losses = entries.filter((entry) => entry.result === "LOSS").length;
  const winRate = wins + losses ? Math.round((wins / (wins + losses)) * 100) : null;

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4"><StatCard label={t("draft.totalPicks")} value={entries.length} accent /><StatCard label={t("draft.championsPlayed")} value={new Set(entries.map((entry) => entry.pick.champion_id)).size} /><StatCard label="W / L" value={`${wins} / ${losses}`} /><StatCard label={t("ops.winRate")} value={winRate === null ? "—" : `${winRate}%`} /></div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row"><Select value={position} onValueChange={setPosition}><SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ALL}>{t("champ.position")}: {t("common.all")}</SelectItem>{POSITIONS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select><Select value={champion} onValueChange={setChampion}><SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ALL}>{t("draft.champion")}: {t("common.all")}</SelectItem>{champions.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent></Select></div>

      {entries.length === 0 ? <EmptyState text={t("draft.historyEmpty")} /> : <>
        <section className="panel overflow-hidden"><div className="border-b border-border px-4 py-3"><h2 className="eyebrow text-foreground">{t("draft.byChampion")}</h2></div><Table><TableHeader><TableRow className="hover:bg-transparent"><TableHead className="eyebrow">{t("draft.champion")}</TableHead><TableHead className="eyebrow">{t("champ.position")}</TableHead><TableHead className="eyebrow text-right">{t("draft.picks")}</TableHead><TableHead className="eyebrow text-right">W / L</TableHead><TableHead className="eyebrow text-right">{t("ops.winRate")}</TableHead><TableHead className="eyebrow hidden text-right md:table-cell">{t("draft.lastPlayed")}</TableHead></TableRow></TableHeader><TableBody>{summaries.map((summary) => <TableRow key={summary.key}><TableCell><div className="flex items-center gap-2 font-medium"><img src={iconFor(summary.championId, catalog.data?.version)} alt="" className="size-7 rounded" width={28} height={28} />{summary.championName}</div></TableCell><TableCell><Badge variant="soft">{summary.position}</Badge></TableCell><TableCell className="text-right tabular">{summary.picks}</TableCell><TableCell className="text-right tabular">{summary.wins} / {summary.losses}</TableCell><TableCell className="text-right font-medium tabular">{summary.winRate === null ? "—" : `${summary.winRate}%`}</TableCell><TableCell className="hidden text-right text-xs text-muted-foreground md:table-cell">{formatZonedDate(summary.lastPlayed, DEFAULT_TIMEZONE, locale, false)}</TableCell></TableRow>)}</TableBody></Table></section>
        <section className="mt-5"><h2 className="eyebrow mb-3 text-foreground">{t("draft.recentPicks")}</h2><div className="divide-y divide-border rounded-md border border-border">{entries.slice(0, 50).map((entry) => <div key={entry.key} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center"><div className="flex min-w-0 flex-1 items-center gap-3"><img src={iconFor(entry.pick.champion_id, catalog.data?.version)} alt="" className="size-9 rounded" width={36} height={36} /><div className="min-w-0"><p className="truncate text-sm font-medium">{entry.pick.champion_name}</p><p className="text-xs text-muted-foreground">Game {entry.gameNumber} · vs {entry.opponent}</p></div></div><div className="flex items-center gap-2"><Badge variant="soft">{entry.pick.position}</Badge><Badge variant={entry.result === "WIN" ? "success" : entry.result === "LOSS" ? "destructive" : "muted"}>{entry.result ?? t("ops.noResult")}</Badge><span className="text-xs text-muted-foreground">{formatZonedDate(entry.startsAt, DEFAULT_TIMEZONE, locale, false)}</span></div></div>)}</div></section>
      </>}
    </div>
  );
}
