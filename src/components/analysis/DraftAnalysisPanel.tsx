import { useMemo, useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { ClipboardList, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/common/Page";
import { supabase } from "@/integrations/supabase/client";
import { draftAnalysesQueryOptions, playersQueryOptions } from "@/lib/queries";
import type { DraftAnalysis } from "@/lib/analysis";
import { useI18n } from "@/i18n";
import { DraftAnalysisDialog } from "./DraftAnalysisDialog";

const ALL = "ALL";
const NONE = "NONE";
const displayDate = (date: string, locale: string) => new Date(`${date}T12:00:00`).toLocaleDateString(locale);

function Detail({ title, value }: { title: string; value: string | null }) {
  if (!value) return null;
  return <div><p className="eyebrow">{title}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{value}</p></div>;
}

export function DraftAnalysisPanel({ canEdit }: { canEdit: boolean }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const { data: analyses } = useSuspenseQuery(draftAnalysesQueryOptions);
  const { data: players } = useSuspenseQuery(playersQueryOptions);
  const [search, setSearch] = useState("");
  const [playerId, setPlayerId] = useState(ALL);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<DraftAnalysis | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<DraftAnalysis | null>(null);
  const selected = analyses.find((analysis) => analysis.id === selectedId) ?? null;
  const nick = (id: string | null) => id ? players.find((player) => player.id === id)?.nickname ?? "—" : t("draft.team");
  const shown = useMemo(() => {
    const query = search.trim().toLowerCase();
    return analyses.filter((analysis) => (!query || `${analysis.title} ${analysis.opponent ?? ""}`.toLowerCase().includes(query)) && (playerId === ALL || (playerId === NONE ? analysis.player_id === null : analysis.player_id === playerId)));
  }, [analyses, search, playerId]);

  const deletion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("draft_analyses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("draft.deleted"));
      setDeleting(null);
      setSelectedId(null);
      qc.invalidateQueries({ queryKey: ["draft-analyses"] });
      qc.invalidateQueries({ queryKey: ["visibility-items"] });
    },
    onError: () => toast.error(t("common.error")),
  });

  function edit(analysis: DraftAnalysis) {
    setEditing(analysis);
    setDialogOpen(true);
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder={t("draft.search")} value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <Select value={playerId} onValueChange={setPlayerId}><SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ALL}>{t("draft.player")}: {t("common.all")}</SelectItem><SelectItem value={NONE}>{t("draft.team")}</SelectItem>{players.map((player) => <SelectItem key={player.id} value={player.id}>{player.nickname}</SelectItem>)}</SelectContent></Select>
        {canEdit && <Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus />{t("draft.new")}</Button>}
      </div>
      {shown.length === 0 ? <EmptyState text={t("draft.empty")} action={canEdit ? <Button variant="soft" onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus />{t("draft.new")}</Button> : undefined} /> : <div className="divide-y divide-border rounded-md border border-border">{shown.map((analysis) => <div key={analysis.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center"><button type="button" onClick={() => setSelectedId(analysis.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left"><div className="grid size-10 shrink-0 place-items-center rounded-md bg-primary-soft text-primary"><ClipboardList className="size-5" /></div><div className="min-w-0"><p className="truncate font-medium">{analysis.title}</p><p className="truncate text-xs text-muted-foreground">{[analysis.opponent, nick(analysis.player_id)].filter(Boolean).join(" · ")}</p></div></button><div className="flex flex-wrap items-center gap-2"><Badge variant="muted">{analysis.team_composition.length} × {analysis.opponent_composition.length}</Badge>{canEdit && <Badge variant="muted">{t(`vis.${analysis.visibility}`)}</Badge>}<span className="text-xs text-muted-foreground">{displayDate(analysis.analysis_date, locale)}</span>{canEdit && <><Button variant="ghost" size="icon" aria-label={t("common.edit")} onClick={() => edit(analysis)}><Pencil /></Button><Button variant="ghost" size="icon" aria-label={t("common.delete")} onClick={() => setDeleting(analysis)}><Trash2 /></Button></>}</div></div>)}</div>}

      <Sheet open={Boolean(selected) && !deleting} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
          {selected && <><SheetHeader><SheetTitle className="font-display text-3xl normal-case">{selected.title}</SheetTitle><SheetDescription>{[selected.opponent, nick(selected.player_id), displayDate(selected.analysis_date, locale)].filter(Boolean).join(" · ")}</SheetDescription></SheetHeader><div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-md border border-border bg-surface p-4"><p className="eyebrow text-primary">ZILENCE</p><p className="mt-2 text-sm">{selected.team_composition.join(" · ") || "—"}</p></div><div className="rounded-md border border-border bg-surface p-4"><p className="eyebrow">{selected.opponent ?? t("draft.opponent")}</p><p className="mt-2 text-sm">{selected.opponent_composition.join(" · ") || "—"}</p></div></div><div className="mt-6 space-y-5"><Detail title={t("draft.strategy")} value={selected.strategy} /><Detail title={t("draft.matchups")} value={selected.matchups} /><Detail title={t("draft.winConditions")} value={selected.win_conditions} /><Detail title={t("draft.positives")} value={selected.positives} /><Detail title={t("draft.problems")} value={selected.problems} /></div>{canEdit && <Button className="mt-6" variant="outline" onClick={() => edit(selected)}><Pencil />{t("common.edit")}</Button>}</>}
        </SheetContent>
      </Sheet>
      {canEdit && <DraftAnalysisDialog open={dialogOpen} onOpenChange={setDialogOpen} analysis={editing} players={players} />}
      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("draft.deleteTitle", { name: deleting?.title ?? "" })}</AlertDialogTitle><AlertDialogDescription>{t("draft.deleteBody")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); if (deleting) deletion.mutate(deleting.id); }}>{t("common.delete")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
