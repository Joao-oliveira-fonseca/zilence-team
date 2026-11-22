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
import { compositionList, type ScrimGame, type ScrimSession } from "@/lib/operations";
import { useI18n } from "@/i18n";
import { ParticipantPicker } from "./OperationFields";

const NONE = "NONE";
const orNull = (value: string) => value.trim() ? value.trim() : null;

export function ScrimGameDialog({ open, onOpenChange, session, game, gameNumber, players }: { open: boolean; onOpenChange: (open: boolean) => void; session: ScrimSession; game?: ScrimGame | null; gameNumber: number; players: Player[] }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: member } = useSuspenseQuery(memberQueryOptions);
  const [result, setResult] = useState(game?.result ?? NONE);
  const [duration, setDuration] = useState("");
  const [ourComp, setOurComp] = useState("");
  const [theirComp, setTheirComp] = useState("");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [observations, setObservations] = useState("");
  const [positives, setPositives] = useState("");
  const [improvements, setImprovements] = useState("");

  useEffect(() => {
    if (open) {
      setResult(game?.result ?? NONE);
      setDuration(game?.duration_minutes ? String(game.duration_minutes) : "");
      setOurComp(game?.zilence_composition.join(", ") ?? "");
      setTheirComp(game?.opponent_composition.join(", ") ?? "");
      setParticipantIds(game?.participant_ids ?? session.participant_ids);
      setObservations(game?.observations ?? "");
      setPositives(game?.positives ?? "");
      setImprovements(game?.improvements ?? "");
    }
  }, [open, game, session]);

  const mutation = useMutation({
    mutationFn: async () => {
      const values = {
        result: result === NONE ? null : result as "WIN" | "LOSS",
        duration_minutes: duration ? Number(duration) : null,
        zilence_composition: compositionList(ourComp),
        opponent_composition: compositionList(theirComp),
        participant_ids: participantIds,
        observations: orNull(observations),
        positives: orNull(positives),
        improvements: orNull(improvements),
      };
      if (game) {
        const { error } = await supabase.from("scrim_games").update(values).eq("id", game.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("scrim_games").insert({ ...values, session_id: session.id, game_number: gameNumber, created_by: member?.userId ?? null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(t("ops.gameSaved"));
      qc.invalidateQueries({ queryKey: ["scrim-games"] });
      onOpenChange(false);
    },
    onError: () => toast.error(t("common.error")),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle className="font-display text-2xl uppercase">{t(game ? "ops.editGame" : "ops.addGame")} · {gameNumber}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>{t("ops.result")}</Label><Select value={result} onValueChange={setResult}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={NONE}>{t("ops.noResult")}</SelectItem><SelectItem value="WIN">WIN</SelectItem><SelectItem value="LOSS">LOSS</SelectItem></SelectContent></Select></div>
          <div className="space-y-1.5"><Label htmlFor="game-duration">{t("ops.duration")} ({t("ops.minutes")})</Label><Input id="game-duration" type="number" min={1} max={1440} value={duration} onChange={(e) => setDuration(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="our-comp">{t("ops.composition")}</Label><Textarea id="our-comp" rows={2} placeholder={t("ops.compositionHint")} value={ourComp} onChange={(e) => setOurComp(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="their-comp">{t("ops.opponentComposition")}</Label><Textarea id="their-comp" rows={2} placeholder={t("ops.compositionHint")} value={theirComp} onChange={(e) => setTheirComp(e.target.value)} /></div>
          <div className="sm:col-span-2"><ParticipantPicker players={players} value={participantIds} onChange={setParticipantIds} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="game-observations">{t("ops.observations")}</Label><Textarea id="game-observations" rows={2} maxLength={3000} value={observations} onChange={(e) => setObservations(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="game-positives">{t("ops.positives")}</Label><Textarea id="game-positives" rows={3} maxLength={3000} value={positives} onChange={(e) => setPositives(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="game-improvements">{t("ops.improvements")}</Label><Textarea id="game-improvements" rows={3} maxLength={3000} value={improvements} onChange={(e) => setImprovements(e.target.value)} /></div>
          <DialogFooter className="sm:col-span-2"><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="animate-spin" />}{mutation.isPending ? t("common.saving") : t("common.save")}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
