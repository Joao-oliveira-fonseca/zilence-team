import { useState } from "react";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Pencil, Plus, Swords, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EmptyState, Section, StatCard } from "@/components/common/Page";
import { supabase } from "@/integrations/supabase/client";
import { playersQueryOptions, scrimGamesQueryOptions, scrimPrivateNotesQueryOptions, scrimSessionsQueryOptions } from "@/lib/queries";
import { formatZonedDate, scrimEvolution, scrimStats, sessionRecord, type ScrimGame, type ScrimSession } from "@/lib/operations";
import { useI18n } from "@/i18n";
import { ScrimDialog } from "./ScrimDialog";
import { ScrimGameDialog } from "./ScrimGameDialog";

export function ScrimsPanel({ canEdit }: { canEdit: boolean }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const { data: sessions } = useSuspenseQuery(scrimSessionsQueryOptions);
  const { data: games } = useSuspenseQuery(scrimGamesQueryOptions);
  const { data: players } = useSuspenseQuery(playersQueryOptions);
  const { data: notes = [] } = useQuery({ ...scrimPrivateNotesQueryOptions, enabled: canEdit });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ScrimSession | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [gameEditing, setGameEditing] = useState<{ game: ScrimGame | null; number: number } | null>(null);
  const [deleteSession, setDeleteSession] = useState(false);
  const [deleteGame, setDeleteGame] = useState<ScrimGame | null>(null);
  const selected = sessions.find((session) => session.id === selectedId) ?? null;
  const stats = scrimStats(sessions, games);
  const evolution = scrimEvolution(sessions, games);

  const sessionDeletion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("scrim_sessions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("ops.scrimDeleted"));
      setDeleteSession(false);
      setSelectedId(null);
      for (const key of ["scrim-sessions", "scrim-games", "calendar-events", "events", "visibility-items"]) qc.invalidateQueries({ queryKey: [key] });
    },
    onError: () => toast.error(t("common.error")),
  });

  const gameDeletion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("scrim_games").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("ops.gameDeleted"));
      setDeleteGame(null);
      qc.invalidateQueries({ queryKey: ["scrim-games"] });
    },
    onError: () => toast.error(t("common.error")),
  });

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label={t("ops.wins")} value={stats.wins} accent />
        <StatCard label={t("ops.losses")} value={stats.losses} />
        <StatCard label={t("ops.winRate")} value={stats.winRate === null ? "—" : `${Math.round(stats.winRate)}%`} />
        <StatCard label={t("ops.totalSessions")} value={stats.sessions} />
        <StatCard label={t("ops.opponents")} value={stats.opponents} />
      </div>

      {evolution.length > 0 && (
        <Section title={t("ops.evolution")} className="mb-5">
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolution} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="opponent" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }} formatter={(value) => [`${value}%`, t("ops.winRate")]} />
                <Line type="monotone" dataKey="winRate" stroke="var(--primary)" strokeWidth={2} dot={{ fill: "var(--primary)", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="eyebrow text-foreground">{t("ops.totalSessions")}</h2>
        {canEdit && <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus />{t("ops.addScrim")}</Button>}
      </div>

      {sessions.length === 0 ? <EmptyState text={t("ops.noScrims")} action={canEdit ? <Button variant="soft" onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus />{t("ops.addScrim")}</Button> : undefined} /> : (
        <div className="divide-y divide-border rounded-md border border-border">
          {sessions.map((session) => {
            const record = sessionRecord(games, session.id);
            return (
              <div key={session.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                <button type="button" onClick={() => setSelectedId(session.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <div className="grid size-10 shrink-0 place-items-center rounded-md bg-primary-soft text-primary"><Swords className="size-5" /></div>
                  <div className="min-w-0"><p className="truncate font-medium">ZILENCE <span className="text-muted-foreground">vs</span> {session.opponent}</p><p className="text-xs text-muted-foreground">{formatZonedDate(session.starts_at, session.timezone, locale)}</p></div>
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="muted">{t(`scrimType.${session.scrim_type}`)}</Badge>
                  <Badge variant="soft" className="tabular">{record.wins}W · {record.losses}L</Badge>
                  {canEdit && <><Button variant="ghost" size="icon" aria-label={t("common.edit")} onClick={() => { setEditing(session); setDialogOpen(true); }}><Pencil /></Button><Button variant="ghost" size="icon" aria-label={t("common.delete")} onClick={() => { setSelectedId(session.id); setDeleteSession(true); }}><Trash2 /></Button></>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Sheet open={Boolean(selected) && !deleteSession} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {selected && (
            <>
              <SheetHeader>
                <Badge variant="soft" className="w-fit">{t(`scrimType.${selected.scrim_type}`)}</Badge>
                <SheetTitle className="font-display text-3xl uppercase">ZILENCE vs {selected.opponent}</SheetTitle>
                <SheetDescription>{formatZonedDate(selected.starts_at, selected.timezone, locale)} · {selected.duration_minutes} {t("ops.minutes")}</SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="eyebrow text-foreground">{t("ops.games")} · {sessionRecord(games, selected.id).wins}W / {sessionRecord(games, selected.id).losses}L</h3>
                  {canEdit && games.filter((game) => game.session_id === selected.id).length < selected.planned_games && <Button size="sm" variant="soft" onClick={() => setGameEditing({ game: null, number: Math.max(0, ...games.filter((game) => game.session_id === selected.id).map((game) => game.game_number)) + 1 })}><Plus />{t("ops.addGame")}</Button>}
                </div>
                <div className="space-y-3">
                  {games.filter((game) => game.session_id === selected.id).sort((a, b) => a.game_number - b.game_number).map((game) => (
                    <div key={game.id} className="rounded-md border border-border bg-surface p-3">
                      <div className="flex items-center gap-2">
                        <span className="flex-1 font-display text-lg font-semibold">{t("ops.game")} {game.game_number}</span>
                        <Badge variant={game.result === "WIN" ? "success" : game.result === "LOSS" ? "destructive" : "muted"}>{game.result ?? t("ops.noResult")}</Badge>
                        {game.duration_minutes && <span className="text-xs text-muted-foreground">{game.duration_minutes} {t("ops.minutes")}</span>}
                        {canEdit && <><Button variant="ghost" size="icon" aria-label={t("common.edit")} onClick={() => setGameEditing({ game, number: game.game_number })}><Pencil /></Button><Button variant="ghost" size="icon" aria-label={t("common.delete")} onClick={() => setDeleteGame(game)}><Trash2 /></Button></>}
                      </div>
                      {(game.zilence_composition.length > 0 || game.opponent_composition.length > 0) && <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2"><p><span className="eyebrow">ZILENCE</span><br /><span className="text-muted-foreground">{game.zilence_composition.join(" · ") || "—"}</span></p><p><span className="eyebrow">{selected.opponent}</span><br /><span className="text-muted-foreground">{game.opponent_composition.join(" · ") || "—"}</span></p></div>}
                      {game.positives && <p className="mt-3 text-xs"><span className="font-medium text-success">{t("ops.positives")}: </span><span className="whitespace-pre-wrap text-muted-foreground">{game.positives}</span></p>}
                      {game.improvements && <p className="mt-2 text-xs"><span className="font-medium text-primary">{t("ops.improvements")}: </span><span className="whitespace-pre-wrap text-muted-foreground">{game.improvements}</span></p>}
                      {game.observations && <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{game.observations}</p>}
                    </div>
                  ))}
                  {games.every((game) => game.session_id !== selected.id) && <EmptyState text={t("ops.noGames")} />}
                </div>
                {canEdit && notes.find((note) => note.session_id === selected.id)?.notes && <div className="mt-5"><p className="eyebrow">{t("ops.privateNotes")}</p><p className="mt-2 whitespace-pre-wrap rounded-md border border-border bg-surface p-3 text-sm text-muted-foreground">{notes.find((note) => note.session_id === selected.id)?.notes}</p></div>}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {canEdit && <ScrimDialog open={dialogOpen} onOpenChange={setDialogOpen} session={editing} players={players} notes={editing ? notes.find((note) => note.session_id === editing.id)?.notes : undefined} />}
      {canEdit && selected && gameEditing && <ScrimGameDialog open onOpenChange={(open) => !open && setGameEditing(null)} session={selected} game={gameEditing.game} gameNumber={gameEditing.number} players={players} />}
      <AlertDialog open={deleteSession} onOpenChange={setDeleteSession}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("ops.deleteScrimTitle", { name: selected?.opponent ?? "" })}</AlertDialogTitle><AlertDialogDescription>{t("ops.deleteScrimBody")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction onClick={(e) => { e.preventDefault(); if (selected) sessionDeletion.mutate(selected.id); }}>{t("common.delete")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={Boolean(deleteGame)} onOpenChange={(open) => !open && setDeleteGame(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("ops.deleteGameTitle", { number: deleteGame?.game_number ?? 0 })}</AlertDialogTitle><AlertDialogDescription>{t("ops.deleteGameBody")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction onClick={(e) => { e.preventDefault(); if (deleteGame) gameDeletion.mutate(deleteGame.id); }}>{t("common.delete")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
