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
import { supabase } from "@/integrations/supabase/client";
import { memberQueryOptions, type Player } from "@/lib/member";
import { VOD_CATEGORIES, safeHttpUrl, type VodCategory, type VodReview } from "@/lib/analysis";
import { useI18n } from "@/i18n";

const NONE = "NONE";
const emptyDate = () => new Date().toISOString().slice(0, 10);

export function VodReviewDialog({ open, onOpenChange, review, players }: { open: boolean; onOpenChange: (open: boolean) => void; review: VodReview | null; players: Player[] }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: member } = useSuspenseQuery(memberQueryOptions);
  const [title, setTitle] = useState("");
  const [playerId, setPlayerId] = useState(NONE);
  const [matchLabel, setMatchLabel] = useState("");
  const [opponent, setOpponent] = useState("");
  const [date, setDate] = useState(emptyDate);
  const [videoUrl, setVideoUrl] = useState("");
  const [category, setCategory] = useState<VodCategory>("macro");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(review?.title ?? "");
    setPlayerId(review?.player_id ?? NONE);
    setMatchLabel(review?.match_label ?? "");
    setOpponent(review?.opponent ?? "");
    setDate(review?.review_date ?? emptyDate());
    setVideoUrl(review?.video_url ?? "");
    setCategory(review?.category ?? "macro");
    setDescription(review?.description ?? "");
  }, [open, review]);

  const mutation = useMutation({
    mutationFn: async () => {
      const values = {
        title: title.trim(),
        player_id: playerId === NONE ? null : playerId,
        match_label: matchLabel.trim() || null,
        opponent: opponent.trim() || null,
        review_date: date,
        video_url: safeHttpUrl(videoUrl.trim())!,
        category,
        description: description.trim() || null,
      };
      if (review) {
        const { error } = await supabase.from("vod_reviews").update(values).eq("id", review.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vod_reviews").insert({ ...values, created_by: member?.userId ?? null, coach_name: member?.profile?.display_name || member?.email || null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(t(review ? "vod.updated" : "vod.created"));
      qc.invalidateQueries({ queryKey: ["vod-reviews"] });
      qc.invalidateQueries({ queryKey: ["visibility-items"] });
      onOpenChange(false);
    },
    onError: () => toast.error(t("common.error")),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!safeHttpUrl(videoUrl.trim())) {
      toast.error(t("vod.invalidUrl"));
      return;
    }
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle className="font-display text-2xl uppercase">{t(review ? "vod.edit" : "vod.new")}</DialogTitle><DialogDescription>{t("vod.visibilityHint")}</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="vod-title">{t("vod.title")}</Label><Input id="vod-title" required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t("vod.player")}</Label><Select value={playerId} onValueChange={setPlayerId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={NONE}>{t("common.none")}</SelectItem>{players.map((player) => <SelectItem key={player.id} value={player.id}>{player.nickname}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label>{t("vod.category")}</Label><Select value={category} onValueChange={(value) => setCategory(value as VodCategory)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{VOD_CATEGORIES.map((item) => <SelectItem key={item} value={item}>{t(`vodCat.${item}`)}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label htmlFor="vod-match">{t("vod.match")}</Label><Input id="vod-match" maxLength={160} value={matchLabel} onChange={(event) => setMatchLabel(event.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="vod-opponent">{t("vod.opponent")}</Label><Input id="vod-opponent" maxLength={100} value={opponent} onChange={(event) => setOpponent(event.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="vod-date">{t("vod.date")}</Label><Input id="vod-date" type="date" required value={date} onChange={(event) => setDate(event.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="vod-url">{t("vod.videoUrl")}</Label><Input id="vod-url" type="url" required maxLength={2000} placeholder="https://youtube.com/watch?v=..." value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="vod-description">{t("vod.description")}</Label><Textarea id="vod-description" rows={5} maxLength={10000} value={description} onChange={(event) => setDescription(event.target.value)} /></div>
          <DialogFooter className="sm:col-span-2"><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="animate-spin" />}{mutation.isPending ? t("common.saving") : t("common.save")}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
