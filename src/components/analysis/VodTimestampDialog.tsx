import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { memberQueryOptions, type Player } from "@/lib/member";
import { VOD_CATEGORIES, formatTimestamp, parseTimestamp, type VodCategory, type VodTimestamp } from "@/lib/analysis";
import { useI18n } from "@/i18n";

const NONE = "NONE";

export function VodTimestampDialog({ open, onOpenChange, reviewId, timestamp, players }: { open: boolean; onOpenChange: (open: boolean) => void; reviewId: string; timestamp: VodTimestamp | null; players: Player[] }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: member } = useSuspenseQuery(memberQueryOptions);
  const [time, setTime] = useState("0:00");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<VodCategory>("macro");
  const [comment, setComment] = useState("");
  const [playerId, setPlayerId] = useState(NONE);

  useEffect(() => {
    if (!open) return;
    setTime(timestamp ? formatTimestamp(timestamp.seconds) : "0:00");
    setTitle(timestamp?.title ?? "");
    setCategory(timestamp?.category ?? "macro");
    setComment(timestamp?.comment ?? "");
    setPlayerId(timestamp?.player_id ?? NONE);
  }, [open, timestamp]);

  const mutation = useMutation({
    mutationFn: async () => {
      const values = { seconds: parseTimestamp(time)!, title: title.trim(), category, comment: comment.trim() || null, player_id: playerId === NONE ? null : playerId };
      if (timestamp) {
        const { error } = await supabase.from("vod_timestamps").update(values).eq("id", timestamp.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vod_timestamps").insert({ ...values, review_id: reviewId, created_by: member?.userId ?? null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(t("vod.timestampSaved"));
      qc.invalidateQueries({ queryKey: ["vod-timestamps"] });
      onOpenChange(false);
    },
    onError: () => toast.error(t("common.error")),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (parseTimestamp(time) === null) {
      toast.error(t("vod.invalidTimestamp"));
      return;
    }
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle className="font-display text-2xl uppercase">{t(timestamp ? "vod.editTimestamp" : "vod.addTimestamp")}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="timestamp-time">{t("vod.timestamp")}</Label><Input id="timestamp-time" required placeholder="12:35" value={time} onChange={(event) => setTime(event.target.value)} /><p className="text-xs text-muted-foreground">{t("vod.timestampHint")}</p></div>
          <div className="space-y-1.5"><Label>{t("vod.category")}</Label><Select value={category} onValueChange={(value) => setCategory(value as VodCategory)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{VOD_CATEGORIES.map((item) => <SelectItem key={item} value={item}>{t(`vodCat.${item}`)}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="timestamp-title">{t("vod.timestampTitle")}</Label><Input id="timestamp-title" required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>{t("vod.player")}</Label><Select value={playerId} onValueChange={setPlayerId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={NONE}>{t("common.none")}</SelectItem>{players.map((player) => <SelectItem key={player.id} value={player.id}>{player.nickname}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="timestamp-comment">{t("vod.comment")}</Label><Textarea id="timestamp-comment" rows={5} maxLength={5000} value={comment} onChange={(event) => setComment(event.target.value)} /></div>
          <DialogFooter className="sm:col-span-2"><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="animate-spin" />}{mutation.isPending ? t("common.saving") : t("common.save")}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
