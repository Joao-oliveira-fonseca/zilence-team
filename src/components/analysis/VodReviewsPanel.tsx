import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Clock3, ExternalLink, Pencil, Plus, Search, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/common/Page";
import { supabase } from "@/integrations/supabase/client";
import { playersQueryOptions, vodReviewsQueryOptions, vodTimestampsQueryOptions } from "@/lib/queries";
import { VOD_CATEGORIES, formatTimestamp, isNativeVideoUrl, videoAtTimestamp, youtubeEmbedUrl, type VodReview, type VodTimestamp } from "@/lib/analysis";
import { useI18n } from "@/i18n";
import { VodReviewDialog } from "./VodReviewDialog";
import { VodTimestampDialog } from "./VodTimestampDialog";

const ALL = "ALL";
const NONE = "NONE";
const displayDate = (date: string, locale: string) => new Date(`${date}T12:00:00`).toLocaleDateString(locale);

export function VodReviewsPanel({ canEdit }: { canEdit: boolean }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const { data: reviews } = useSuspenseQuery(vodReviewsQueryOptions);
  const { data: timestamps } = useSuspenseQuery(vodTimestampsQueryOptions);
  const { data: players } = useSuspenseQuery(playersQueryOptions);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL);
  const [playerId, setPlayerId] = useState(ALL);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<VodReview | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [timestampEditing, setTimestampEditing] = useState<VodTimestamp | null>(null);
  const [timestampOpen, setTimestampOpen] = useState(false);
  const [deleting, setDeleting] = useState<VodReview | null>(null);
  const [deletingTimestamp, setDeletingTimestamp] = useState<VodTimestamp | null>(null);
  const [activeSeconds, setActiveSeconds] = useState(0);
  const selected = reviews.find((review) => review.id === selectedId) ?? null;
  const selectedTimestamps = timestamps.filter((timestamp) => timestamp.review_id === selectedId);
  const nick = (id: string | null) => id ? players.find((player) => player.id === id)?.nickname ?? "—" : null;

  useEffect(() => setActiveSeconds(0), [selectedId]);

  const shown = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reviews.filter((review) =>
      (!query || `${review.title} ${review.match_label ?? ""} ${review.opponent ?? ""}`.toLowerCase().includes(query)) &&
      (category === ALL || review.category === category) &&
      (playerId === ALL || (playerId === NONE ? review.player_id === null : review.player_id === playerId)),
    );
  }, [reviews, search, category, playerId]);

  const reviewDeletion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vod_reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("vod.deleted"));
      setDeleting(null);
      setSelectedId(null);
      for (const key of ["vod-reviews", "vod-timestamps", "visibility-items"]) qc.invalidateQueries({ queryKey: [key] });
    },
    onError: () => toast.error(t("common.error")),
  });
  const timestampDeletion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vod_timestamps").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("vod.timestampDeleted"));
      setDeletingTimestamp(null);
      qc.invalidateQueries({ queryKey: ["vod-timestamps"] });
    },
    onError: () => toast.error(t("common.error")),
  });

  function edit(review: VodReview) {
    setEditing(review);
    setDialogOpen(true);
  }
  function editTimestamp(timestamp: VodTimestamp | null) {
    setTimestampEditing(timestamp);
    setTimestampOpen(true);
  }

  const embedUrl = selected ? youtubeEmbedUrl(selected.video_url, activeSeconds) : null;

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 lg:flex-row">
        <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder={t("vod.search")} value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <Select value={category} onValueChange={setCategory}><SelectTrigger className="lg:w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ALL}>{t("vod.category")}: {t("common.all")}</SelectItem>{VOD_CATEGORIES.map((item) => <SelectItem key={item} value={item}>{t(`vodCat.${item}`)}</SelectItem>)}</SelectContent></Select>
        <Select value={playerId} onValueChange={setPlayerId}><SelectTrigger className="lg:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ALL}>{t("vod.player")}: {t("common.all")}</SelectItem><SelectItem value={NONE}>{t("common.none")}</SelectItem>{players.map((player) => <SelectItem key={player.id} value={player.id}>{player.nickname}</SelectItem>)}</SelectContent></Select>
        {canEdit && <Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus />{t("vod.new")}</Button>}
      </div>

      {shown.length === 0 ? <EmptyState text={t("vod.empty")} action={canEdit ? <Button variant="soft" onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus />{t("vod.new")}</Button> : undefined} /> : (
        <div className="divide-y divide-border rounded-md border border-border">
          {shown.map((review) => (
            <div key={review.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
              <button type="button" onClick={() => setSelectedId(review.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <div className="grid size-11 shrink-0 place-items-center rounded-md bg-primary-soft text-primary"><Video className="size-5" /></div>
                <div className="min-w-0"><p className="truncate font-medium">{review.title}</p><p className="truncate text-xs text-muted-foreground">{[review.match_label, review.opponent, nick(review.player_id)].filter(Boolean).join(" · ") || displayDate(review.review_date, locale)}</p></div>
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="soft">{t(`vodCat.${review.category}`)}</Badge>
                <Badge variant="muted"><Clock3 className="mr-1 size-3" />{timestamps.filter((timestamp) => timestamp.review_id === review.id).length}</Badge>
                {canEdit && <Badge variant="muted">{t(`vis.${review.visibility}`)}</Badge>}
                <span className="text-xs text-muted-foreground">{displayDate(review.review_date, locale)}</span>
                {canEdit && <><Button variant="ghost" size="icon" aria-label={t("common.edit")} onClick={() => edit(review)}><Pencil /></Button><Button variant="ghost" size="icon" aria-label={t("common.delete")} onClick={() => setDeleting(review)}><Trash2 /></Button></>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet open={Boolean(selected) && !deleting} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-5xl">
          {selected && <>
            <SheetHeader><div className="flex flex-wrap gap-2"><Badge variant="soft">{t(`vodCat.${selected.category}`)}</Badge>{nick(selected.player_id) && <Badge variant="muted">{nick(selected.player_id)}</Badge>}</div><SheetTitle className="font-display text-3xl normal-case">{selected.title}</SheetTitle><SheetDescription>{[selected.match_label, selected.opponent, displayDate(selected.review_date, locale)].filter(Boolean).join(" · ")}</SheetDescription></SheetHeader>
            <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
              <div>
                <div className="aspect-video overflow-hidden rounded-md border border-border bg-surface">
                  {embedUrl ? <iframe key={embedUrl} src={embedUrl} title={selected.title} className="size-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /> : isNativeVideoUrl(selected.video_url) ? <video key={activeSeconds} controls className="size-full" src={videoAtTimestamp(selected.video_url, activeSeconds)} /> : <div className="flex size-full flex-col items-center justify-center gap-3 p-6 text-center"><Video className="size-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">{t("vod.externalVideo")}</p><Button variant="soft" asChild><a href={videoAtTimestamp(selected.video_url, activeSeconds)} target="_blank" rel="noreferrer"><ExternalLink />{t("vod.openVideo")}</a></Button></div>}
                </div>
                {selected.description && <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{selected.description}</p>}
                <div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" size="sm" asChild><a href={videoAtTimestamp(selected.video_url, activeSeconds)} target="_blank" rel="noreferrer"><ExternalLink />{t("vod.openAtTimestamp")}</a></Button>{canEdit && <Button variant="outline" size="sm" onClick={() => edit(selected)}><Pencil />{t("common.edit")}</Button>}</div>
              </div>
              <div>
                <div className="mb-3 flex items-center justify-between"><h3 className="eyebrow text-foreground">{t("vod.timestamps")} · {selectedTimestamps.length}</h3>{canEdit && <Button size="sm" variant="soft" onClick={() => editTimestamp(null)}><Plus />{t("vod.addTimestamp")}</Button>}</div>
                {selectedTimestamps.length === 0 ? <EmptyState text={t("vod.noTimestamps")} /> : <div className="space-y-2">{selectedTimestamps.map((timestamp) => <article key={timestamp.id} className="rounded-md border border-border bg-surface p-3"><div className="flex items-start gap-2"><button type="button" onClick={() => setActiveSeconds(timestamp.seconds)} className="flex min-w-0 flex-1 items-start gap-2 text-left"><span className="rounded bg-primary-soft px-2 py-1 font-mono text-xs font-semibold text-primary tabular">{formatTimestamp(timestamp.seconds)}</span><span className="min-w-0"><span className="block text-sm font-medium">{timestamp.title}</span><span className="mt-1 block text-xs text-muted-foreground">{t(`vodCat.${timestamp.category}`)}{nick(timestamp.player_id) ? ` · ${nick(timestamp.player_id)}` : ""}</span></span></button>{canEdit && <div className="flex shrink-0"><Button variant="ghost" size="icon" className="size-7" aria-label={t("common.edit")} onClick={() => editTimestamp(timestamp)}><Pencil className="size-3.5" /></Button><Button variant="ghost" size="icon" className="size-7" aria-label={t("common.delete")} onClick={() => setDeletingTimestamp(timestamp)}><Trash2 className="size-3.5" /></Button></div>}</div>{timestamp.comment && <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{timestamp.comment}</p>}</article>)}</div>}
              </div>
            </div>
          </>}
        </SheetContent>
      </Sheet>
      {canEdit && <VodReviewDialog open={dialogOpen} onOpenChange={setDialogOpen} review={editing} players={players} />}
      {canEdit && selected && <VodTimestampDialog open={timestampOpen} onOpenChange={setTimestampOpen} reviewId={selected.id} timestamp={timestampEditing} players={players} />}
      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("vod.deleteTitle", { name: deleting?.title ?? "" })}</AlertDialogTitle><AlertDialogDescription>{t("vod.deleteBody")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); if (deleting) reviewDeletion.mutate(deleting.id); }}>{t("common.delete")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={Boolean(deletingTimestamp)} onOpenChange={(open) => !open && setDeletingTimestamp(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("vod.deleteTimestampTitle")}</AlertDialogTitle><AlertDialogDescription>{t("vod.deleteTimestampBody")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); if (deletingTimestamp) timestampDeletion.mutate(deletingTimestamp.id); }}>{t("common.delete")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
