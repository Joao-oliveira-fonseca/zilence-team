import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/Page";
import { Stars } from "@/components/common/Stars";
import { supabase } from "@/integrations/supabase/client";
import { championPoolQueryOptions } from "@/lib/queries";
import { championsQueryOptions, iconFor, type Champion } from "@/lib/champions";
import { championPoolRating, formatRating } from "@/lib/evaluation";
import { POSITIONS, type Position } from "@/lib/constants";
import type { Database } from "@/integrations/supabase/types";
import type { Player } from "@/lib/member";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

type PoolEntry = Database["public"]["Tables"]["champion_pool"]["Row"];

function PositionFilter({ value, onChange }: { value: Position | "ALL"; onChange: (v: Position | "ALL") => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {(["ALL", ...POSITIONS] as const).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={cn(
            "rounded px-2.5 py-1 font-display text-xs font-semibold tracking-wider transition-colors",
            value === p ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground hover:text-foreground",
          )}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

function ChampionDialog({ player, entry, open, onOpenChange }: { player: Player; entry: PoolEntry | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const catalog = useQuery({ ...championsQueryOptions, enabled: open });
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Position | "ALL">("ALL");
  const [champ, setChamp] = useState<Pick<Champion, "id" | "name"> | null>(null);
  const [position, setPosition] = useState<Position>(player.main_position);
  const [rating, setRating] = useState(3);
  const [comment, setComment] = useState("");
  const [mastery, setMastery] = useState("");

  useEffect(() => {
    if (!open) return;
    setQ("");
    setFilter(entry?.position ?? player.main_position);
    setChamp(entry ? { id: entry.champion_id, name: entry.champion_name } : null);
    setPosition(entry?.position ?? player.main_position);
    setRating(entry?.rating ?? 3);
    setComment(entry?.comment ?? "");
    setMastery(entry?.mastery_notes ?? "");
  }, [open, entry, player.main_position]);

  const list = useMemo(
    () =>
      (catalog.data?.champions ?? []).filter(
        (c) => (filter === "ALL" || c.positions.includes(filter)) && c.name.toLowerCase().includes(q.trim().toLowerCase()),
      ),
    [catalog.data, filter, q],
  );

  const save = useMutation({
    mutationFn: async () => {
      const values = {
        champion_id: champ!.id,
        champion_name: champ!.name,
        position,
        rating: Math.max(1, rating),
        comment: comment.trim().slice(0, 1000) || null,
        mastery_notes: mastery.trim().slice(0, 1000) || null,
      };
      if (entry) {
        const { error } = await supabase.from("champion_pool").update(values).eq("id", entry.id);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase.from("champion_pool").insert({ ...values, player_id: player.id, created_by: u.user?.id ?? null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(t("champ.saved"));
      qc.invalidateQueries({ queryKey: ["champion-pool"] });
      onOpenChange(false);
    },
    onError: (e: unknown) => toast.error((e as { code?: string }).code === "23505" ? t("champ.duplicate") : t("common.error")),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl uppercase">{entry ? t("champ.edit") : t("champ.add")}</DialogTitle>
        </DialogHeader>
        {!entry && (
          <div className="space-y-3">
            <div><p className="eyebrow">{t("champ.catalog")}</p><p className="mt-1 text-xs text-muted-foreground">{t("champ.roleHint")}</p></div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder={t("champ.search")} value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <PositionFilter value={filter} onChange={setFilter} />
            </div>
            {catalog.isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : catalog.isError ? (
              <p className="py-6 text-center text-sm text-destructive">{t("champ.loadError")}</p>
            ) : (
              <div className="grid max-h-64 grid-cols-5 gap-2 overflow-y-auto pr-1 sm:grid-cols-8">
                {list.length === 0 && <p className="col-span-full py-6 text-center text-sm text-muted-foreground">{t("champ.noChampions")}</p>}
                {list.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setChamp(c);
                      if (filter !== "ALL") setPosition(filter);
                      else if (!c.positions.includes(position)) setPosition(c.positions[0] ?? position);
                    }}
                    className={cn("group flex flex-col items-center gap-1 rounded-md p-1 transition-colors", champ?.id === c.id ? "bg-primary-soft ring-1 ring-primary" : "hover:bg-surface")}
                    title={c.name}
                  >
                    <img src={c.icon} alt={c.name} loading="lazy" className="size-12 rounded" width={48} height={48} />
                    <span className="w-full truncate text-center text-[10px]">{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {champ ? (
          <div className="grid gap-4 rounded-md border border-border bg-surface p-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 sm:col-span-2">
              <img src={iconFor(champ.id, catalog.data?.version)} alt={champ.name} className="size-12 rounded" width={48} height={48} />
              <p className="font-display text-2xl font-bold uppercase">{champ.name}</p>
            </div>
            <div className="space-y-1.5">
              <Label>{t("champ.position")}</Label>
              <div className="flex flex-wrap gap-1">
                {POSITIONS.filter((p) => entry || catalog.data?.champions.find((c) => c.id === champ.id)?.positions.includes(p)).map((p) => (
                  <button key={p} type="button" onClick={() => setPosition(p)} className={cn("rounded px-2.5 py-1 font-display text-xs font-semibold tracking-wider", position === p ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground")}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("champ.rating")}</Label>
              <Stars value={rating} onChange={(v) => setRating(v || 1)} label={t("champ.rating")} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("champ.comment")}</Label>
              <Textarea rows={3} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("champ.mastery")}</Label>
              <Textarea rows={3} maxLength={1000} value={mastery} onChange={(e) => setMastery(e.target.value)} />
            </div>
          </div>
        ) : (
          !entry && <p className="text-center text-sm text-muted-foreground">{t("champ.select")}</p>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button disabled={!champ || save.isPending} onClick={() => save.mutate()}>
            {save.isPending && <Loader2 className="animate-spin" />}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ChampionPoolTab({ player, editable }: { player: Player; editable: boolean }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery(championPoolQueryOptions(player.id));
  const version = useQuery(championsQueryOptions).data?.version;
  const [filter, setFilter] = useState<Position | "ALL">("ALL");
  const [dialog, setDialog] = useState<{ open: boolean; entry: PoolEntry | null }>({ open: false, entry: null });
  const shown = data.filter((e) => filter === "ALL" || e.position === filter);
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("champion_pool").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("champ.removed"));
      qc.invalidateQueries({ queryKey: ["champion-pool"] });
    },
    onError: () => toast.error(t("common.error")),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="rounded-md border border-border bg-surface px-3 py-2">
          <p className="eyebrow">{t("champ.poolRating")}</p>
          <p className="font-display text-2xl font-bold text-primary tabular">{formatRating(championPoolRating(data.map((e) => e.rating)))}</p>
        </div>
        {editable && (
          <Button onClick={() => setDialog({ open: true, entry: null })}>
            <Plus />
            {t("champ.add")}
          </Button>
        )}
      </div>
      <PositionFilter value={filter} onChange={setFilter} />
      {isLoading ? (
        <Loader2 className="mx-auto animate-spin text-muted-foreground" />
      ) : shown.length === 0 ? (
        <EmptyState text={t("champ.empty")} />
      ) : (
        <ul className="space-y-2">
          {shown.map((e) => (
            <li key={e.id} className="flex items-start gap-3 rounded-md border border-border bg-surface p-3">
              <img src={iconFor(e.champion_id, version)} alt={e.champion_name} className="size-11 rounded" width={44} height={44} loading="lazy" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{e.champion_name}</p>
                  <Badge variant="soft">{e.position}</Badge>
                  <Stars value={e.rating} size="sm" />
                </div>
                {e.comment && <p className="mt-1 text-sm text-muted-foreground">{e.comment}</p>}
                {e.mastery_notes && <p className="mt-1 text-xs text-muted-foreground/80">{e.mastery_notes}</p>}
                <p className="mt-1 text-[11px] text-muted-foreground">{t("champ.updated", { date: new Date(e.updated_at).toLocaleDateString(locale) })}</p>
              </div>
              {editable && (
                <div className="flex">
                  <Button variant="ghost" size="icon" aria-label={t("common.edit")} onClick={() => setDialog({ open: true, entry: e })}><Pencil /></Button>
                  <Button variant="ghost" size="icon" aria-label={t("common.delete")} onClick={() => window.confirm(`${t("common.delete")} ${e.champion_name}?`) && remove.mutate(e.id)}><Trash2 /></Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {editable && <ChampionDialog player={player} entry={dialog.entry} open={dialog.open} onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))} />}
    </div>
  );
}
