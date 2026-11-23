import { useMemo, useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Lock, Pencil, Pin, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/common/Page";
import { supabase } from "@/integrations/supabase/client";
import { coachNotesQueryOptions, playersQueryOptions } from "@/lib/queries";
import { COACH_NOTE_CATEGORIES, type CoachNote } from "@/lib/analysis";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { CoachNoteDialog } from "./CoachNoteDialog";

const ALL = "ALL";

export function CoachNotesPanel() {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const { data: notes } = useSuspenseQuery(coachNotesQueryOptions);
  const { data: players } = useSuspenseQuery(playersQueryOptions);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL);
  const [playerId, setPlayerId] = useState(ALL);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<CoachNote | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<CoachNote | null>(null);
  const selected = notes.find((note) => note.id === selectedId) ?? null;
  const nick = (id: string | null) => id ? players.find((player) => player.id === id)?.nickname ?? "—" : null;
  const shown = useMemo(() => {
    const query = search.trim().toLowerCase();
    return notes.filter((note) =>
      (!query || `${note.title} ${note.content}`.toLowerCase().includes(query)) &&
      (category === ALL || note.category === category) &&
      (playerId === ALL || (playerId === NONE ? note.player_id === null : note.player_id === playerId)),
    );
  }, [notes, search, category, playerId]);

  const pinMutation = useMutation({
    mutationFn: async (note: CoachNote) => {
      const { error } = await supabase.from("coach_notes").update({ pinned: !note.pinned }).eq("id", note.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coach-notes"] }),
    onError: () => toast.error(t("common.error")),
  });
  const deletion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coach_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("notes.deleted"));
      setDeleting(null);
      setSelectedId(null);
      qc.invalidateQueries({ queryKey: ["coach-notes"] });
    },
    onError: () => toast.error(t("common.error")),
  });

  function edit(note: CoachNote) {
    setEditing(note);
    setDialogOpen(true);
  }

  return (
    <div>
      <div className="mb-4 flex items-start gap-3 rounded-md border border-primary/25 bg-primary-soft p-3">
        <Lock className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-xs text-muted-foreground">{t("notes.privateHint")}</p>
      </div>
      <div className="mb-4 flex flex-col gap-2 lg:flex-row">
        <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder={t("notes.search")} value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <Select value={category} onValueChange={setCategory}><SelectTrigger className="lg:w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ALL}>{t("notes.category")}: {t("common.all")}</SelectItem>{COACH_NOTE_CATEGORIES.map((item) => <SelectItem key={item} value={item}>{t(`noteCat.${item}`)}</SelectItem>)}</SelectContent></Select>
        <Select value={playerId} onValueChange={setPlayerId}><SelectTrigger className="lg:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ALL}>{t("notes.player")}: {t("common.all")}</SelectItem><SelectItem value={NONE}>{t("common.none")}</SelectItem>{players.map((player) => <SelectItem key={player.id} value={player.id}>{player.nickname}</SelectItem>)}</SelectContent></Select>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus />{t("notes.new")}</Button>
      </div>

      {shown.length === 0 ? <EmptyState text={t("notes.empty")} action={<Button variant="soft" onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus />{t("notes.new")}</Button>} /> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((note) => (
            <article key={note.id} className="panel group flex min-h-56 flex-col p-4">
              <div className="flex items-start gap-2">
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setSelectedId(note.id)}><Badge variant="muted">{t(`noteCat.${note.category}`)}</Badge><h3 className="mt-3 line-clamp-2 text-xl font-semibold normal-case">{note.title}</h3></button>
                <Button variant="ghost" size="icon" aria-label={t("notes.pinned")} className={cn(note.pinned && "bg-primary-soft text-primary")} onClick={() => pinMutation.mutate(note)}><Pin className={cn(note.pinned && "fill-current")} /></Button>
              </div>
              <button type="button" onClick={() => setSelectedId(note.id)} className="mt-2 flex-1 text-left"><p className="line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">{note.content}</p></button>
              <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                <div className="min-w-0 flex-1 text-xs text-muted-foreground"><p className="truncate">{nick(note.player_id) ?? note.author_name}</p><p>{new Date(note.updated_at).toLocaleDateString(locale)}</p></div>
                <Button variant="ghost" size="icon" aria-label={t("common.edit")} onClick={() => edit(note)}><Pencil /></Button>
                <Button variant="ghost" size="icon" aria-label={t("common.delete")} onClick={() => setDeleting(note)}><Trash2 /></Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {selected && <><SheetHeader><div className="flex flex-wrap gap-2"><Badge variant="soft">{t(`noteCat.${selected.category}`)}</Badge>{selected.pinned && <Badge variant="muted"><Pin className="mr-1 size-3" />{t("notes.pinned")}</Badge>}</div><SheetTitle className="font-display text-3xl normal-case">{selected.title}</SheetTitle><SheetDescription>{selected.author_name} · {new Date(selected.updated_at).toLocaleString(locale)}{nick(selected.player_id) ? ` · ${nick(selected.player_id)}` : ""}</SheetDescription></SheetHeader><p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{selected.content}</p><div className="mt-6 flex gap-2"><Button variant="outline" onClick={() => edit(selected)}><Pencil />{t("common.edit")}</Button><Button variant="outline" onClick={() => pinMutation.mutate(selected)}><Pin />{t(selected.pinned ? "notes.unpin" : "notes.pin")}</Button></div></>}
        </SheetContent>
      </Sheet>
      <CoachNoteDialog open={dialogOpen} onOpenChange={setDialogOpen} note={editing} players={players} />
      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("notes.deleteTitle", { name: deleting?.title ?? "" })}</AlertDialogTitle><AlertDialogDescription>{t("notes.deleteBody")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); if (deleting) deletion.mutate(deleting.id); }}>{t("common.delete")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}

const NONE = "NONE";
