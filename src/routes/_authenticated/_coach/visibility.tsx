import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Lock, User, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState, PageHeader } from "@/components/common/Page";
import { supabase } from "@/integrations/supabase/client";
import { playersQueryOptions } from "@/lib/queries";
import { formatRating } from "@/lib/evaluation";
import { useI18n, type TranslationKey } from "@/i18n";
import type { Database } from "@/integrations/supabase/types";

type Level = Database["public"]["Enums"]["visibility_level"];
type Kind = "evaluations" | "champions" | "tasks" | "events";
type Item = { id: string; kind: Kind; name: string; playerId: string | null; level: Level; updated: string; coach: string | null };

const TABLE: Record<Kind, "player_evaluations" | "champion_pool" | "team_tasks" | "calendar_events"> = {
  evaluations: "player_evaluations",
  champions: "champion_pool",
  tasks: "team_tasks",
  events: "calendar_events",
};

const itemsQuery = queryOptions({
  queryKey: ["visibility-items"],
  queryFn: async (): Promise<Item[]> => {
    const [ev, cp, tk, ce] = await Promise.all([
      supabase.from("player_evaluations").select("id, player_id, overall, evaluated_at, visibility, updated_at, coach_name"),
      supabase.from("champion_pool").select("id, player_id, champion_name, position, visibility, updated_at"),
      supabase.from("team_tasks").select("id, player_id, title, visibility, updated_at"),
      supabase.from("calendar_events").select("id, related_player_id, title, visibility, updated_at"),
    ]);
    for (const r of [ev, cp, tk, ce]) if (r.error) throw r.error;
    return [
      ...(ev.data ?? []).map((e) => ({ id: e.id, kind: "evaluations" as const, name: `Overall ${formatRating(e.overall)} · ${new Date(e.evaluated_at).toLocaleDateString()}`, playerId: e.player_id, level: e.visibility, updated: e.updated_at, coach: e.coach_name })),
      ...(cp.data ?? []).map((e) => ({ id: e.id, kind: "champions" as const, name: `${e.champion_name} (${e.position})`, playerId: e.player_id, level: e.visibility, updated: e.updated_at, coach: null })),
      ...(tk.data ?? []).map((e) => ({ id: e.id, kind: "tasks" as const, name: e.title, playerId: e.player_id, level: e.visibility, updated: e.updated_at, coach: null })),
      ...(ce.data ?? []).map((e) => ({ id: e.id, kind: "events" as const, name: e.title, playerId: e.related_player_id, level: e.visibility, updated: e.updated_at, coach: null })),
    ].sort((a, b) => b.updated.localeCompare(a.updated));
  },
});

export const Route = createFileRoute("/_authenticated/_coach/visibility")({
  head: () => ({ meta: [{ title: "Visibility Control — ZILENCE" }] }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(itemsQuery), context.queryClient.ensureQueryData(playersQueryOptions)]),
  component: VisibilityPage,
});

const LEVELS: Level[] = ["private", "player", "team"];
const ICON = { private: Lock, player: User, team: Users };
const ALL = "all";

function VisibilityPage() {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const { data: items } = useSuspenseQuery(itemsQuery);
  const { data: players } = useSuspenseQuery(playersQueryOptions);
  const [kind, setKind] = useState<string>(ALL);
  const [player, setPlayer] = useState<string>(ALL);
  const [level, setLevel] = useState<string>(ALL);
  const [pending, setPending] = useState<{ item: Item; level: Level } | null>(null);
  const nick = (id: string | null) => (id ? players.find((p) => p.id === id)?.nickname ?? "—" : t("vis.teamHint"));

  const shown = useMemo(
    () => items.filter((i) => (kind === ALL || i.kind === kind) && (player === ALL || i.playerId === player) && (level === ALL || i.level === level)),
    [items, kind, player, level],
  );

  const mutation = useMutation({
    mutationFn: async ({ item, level }: { item: Item; level: Level }) => {
      const { error } = await supabase.from(TABLE[item.kind]).update({ visibility: level }).eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("vis.changed"));
      setPending(null);
      qc.invalidateQueries();
    },
    onError: () => toast.error(t("common.error")),
  });

  return (
    <div className="fade-up">
      <PageHeader title={t("vis.title")} subtitle={t("vis.subtitle")} />
      <div className="mb-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        {LEVELS.map((l) => {
          const I = ICON[l];
          return (
            <span key={l} className="flex items-center gap-1.5">
              <I className="size-3.5 text-primary" />
              <b className="font-display tracking-wider text-foreground">{t(`vis.${l}` as TranslationKey)}</b> {t(`vis.${l}Hint` as TranslationKey)}
            </span>
          );
        })}
      </div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="sm:w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("vis.category")}: {t("common.all")}</SelectItem>
            {(Object.keys(TABLE) as Kind[]).map((k) => <SelectItem key={k} value={k}>{t(`vis.cat.${k}` as TranslationKey)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={player} onValueChange={setPlayer}>
          <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("vis.player.col")}: {t("common.all")}</SelectItem>
            {players.map((p) => <SelectItem key={p.id} value={p.id}>{p.nickname}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("vis.level")}: {t("common.all")}</SelectItem>
            {LEVELS.map((l) => <SelectItem key={l} value={l}>{t(`vis.${l}` as TranslationKey)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="panel overflow-hidden">
        {shown.length === 0 ? (
          <EmptyState text={t("vis.empty")} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="eyebrow">{t("vis.content")}</TableHead>
                <TableHead className="eyebrow hidden sm:table-cell">{t("vis.category")}</TableHead>
                <TableHead className="eyebrow hidden md:table-cell">{t("vis.player.col")}</TableHead>
                <TableHead className="eyebrow">{t("vis.level")}</TableHead>
                <TableHead className="eyebrow hidden lg:table-cell">{t("vis.updated")}</TableHead>
                <TableHead className="eyebrow hidden lg:table-cell">{t("vis.coach")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((i) => (
                <TableRow key={`${i.kind}-${i.id}`}>
                  <TableCell className="font-medium">{i.name}</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{t(`vis.cat.${i.kind}` as TranslationKey)}</TableCell>
                  <TableCell className="hidden md:table-cell">{nick(i.playerId)}</TableCell>
                  <TableCell>
                    <Select value={i.level} onValueChange={(v) => v !== i.level && setPending({ item: i, level: v as Level })}>
                      <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LEVELS.map((l) => {
                          const I = ICON[l];
                          return (
                            <SelectItem key={l} value={l}>
                              <span className="flex items-center gap-1.5"><I className="size-3.5" />{t(`vis.${l}` as TranslationKey)}</span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">{new Date(i.updated).toLocaleString(locale)}</TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">{i.coach ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{t("vis.notesNote")}</p>

      <AlertDialog open={Boolean(pending)} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("vis.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("vis.confirmBody", { name: pending?.item.name ?? "", level: pending ? t(`vis.${pending.level}` as TranslationKey) : "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); if (pending) mutation.mutate(pending); }}>{t("common.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
