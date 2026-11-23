import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { memberQueryOptions, type Player } from "@/lib/member";
import { COACH_NOTE_CATEGORIES, type CoachNote, type CoachNoteCategory } from "@/lib/analysis";
import { useI18n } from "@/i18n";

const NONE = "NONE";

export function CoachNoteDialog({ open, onOpenChange, note, players }: { open: boolean; onOpenChange: (open: boolean) => void; note: CoachNote | null; players: Player[] }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: member } = useSuspenseQuery(memberQueryOptions);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<CoachNoteCategory>("general_notes");
  const [playerId, setPlayerId] = useState(NONE);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(note?.title ?? "");
    setContent(note?.content ?? "");
    setCategory(note?.category ?? "general_notes");
    setPlayerId(note?.player_id ?? NONE);
    setPinned(note?.pinned ?? false);
  }, [open, note]);

  const mutation = useMutation({
    mutationFn: async () => {
      const values = { title: title.trim(), content: content.trim(), category, player_id: playerId === NONE ? null : playerId, pinned };
      if (note) {
        const { error } = await supabase.from("coach_notes").update(values).eq("id", note.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("coach_notes").insert({
          ...values,
          created_by: member?.userId ?? null,
          author_name: member?.profile?.display_name || member?.email || "Coach",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(t(note ? "notes.updated" : "notes.created"));
      qc.invalidateQueries({ queryKey: ["coach-notes"] });
      onOpenChange(false);
    },
    onError: () => toast.error(t("common.error")),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl uppercase">{t(note ? "notes.edit" : "notes.new")}</DialogTitle>
          <DialogDescription>{t("notes.privateHint")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="note-title">{t("notes.title")}</Label><Input id="note-title" required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t("notes.category")}</Label><Select value={category} onValueChange={(value) => setCategory(value as CoachNoteCategory)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{COACH_NOTE_CATEGORIES.map((item) => <SelectItem key={item} value={item}>{t(`noteCat.${item}`)}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label>{t("notes.player")}</Label><Select value={playerId} onValueChange={setPlayerId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={NONE}>{t("common.none")}</SelectItem>{players.map((player) => <SelectItem key={player.id} value={player.id}>{player.nickname}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="note-content">{t("notes.content")}</Label><Textarea id="note-content" required rows={12} maxLength={30000} value={content} onChange={(event) => setContent(event.target.value)} /></div>
          <label className="flex cursor-pointer items-center justify-between rounded-md border border-border p-3 sm:col-span-2"><span className="text-sm font-medium">{t("notes.pinned")}</span><Switch checked={pinned} onCheckedChange={setPinned} /></label>
          <DialogFooter className="sm:col-span-2"><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="animate-spin" />}{mutation.isPending ? t("common.saving") : t("common.save")}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
