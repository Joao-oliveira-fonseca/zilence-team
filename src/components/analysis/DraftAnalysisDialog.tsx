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
import { compositionList } from "@/lib/operations";
import type { DraftAnalysis } from "@/lib/analysis";
import { useI18n } from "@/i18n";

const NONE = "NONE";
const emptyDate = () => new Date().toISOString().slice(0, 10);
const orNull = (value: string) => value.trim() || null;

export function DraftAnalysisDialog({ open, onOpenChange, analysis, players }: { open: boolean; onOpenChange: (open: boolean) => void; analysis: DraftAnalysis | null; players: Player[] }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: member } = useSuspenseQuery(memberQueryOptions);
  const [title, setTitle] = useState("");
  const [opponent, setOpponent] = useState("");
  const [date, setDate] = useState(emptyDate);
  const [playerId, setPlayerId] = useState(NONE);
  const [teamComposition, setTeamComposition] = useState("");
  const [opponentComposition, setOpponentComposition] = useState("");
  const [strategy, setStrategy] = useState("");
  const [matchups, setMatchups] = useState("");
  const [winConditions, setWinConditions] = useState("");
  const [positives, setPositives] = useState("");
  const [problems, setProblems] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(analysis?.title ?? "");
    setOpponent(analysis?.opponent ?? "");
    setDate(analysis?.analysis_date ?? emptyDate());
    setPlayerId(analysis?.player_id ?? NONE);
    setTeamComposition(analysis?.team_composition.join(", ") ?? "");
    setOpponentComposition(analysis?.opponent_composition.join(", ") ?? "");
    setStrategy(analysis?.strategy ?? "");
    setMatchups(analysis?.matchups ?? "");
    setWinConditions(analysis?.win_conditions ?? "");
    setPositives(analysis?.positives ?? "");
    setProblems(analysis?.problems ?? "");
  }, [open, analysis]);

  const mutation = useMutation({
    mutationFn: async () => {
      const values = {
        title: title.trim(), opponent: orNull(opponent), analysis_date: date, player_id: playerId === NONE ? null : playerId,
        team_composition: compositionList(teamComposition), opponent_composition: compositionList(opponentComposition),
        strategy: orNull(strategy), matchups: orNull(matchups), win_conditions: orNull(winConditions), positives: orNull(positives), problems: orNull(problems),
      };
      if (analysis) {
        const { error } = await supabase.from("draft_analyses").update(values).eq("id", analysis.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("draft_analyses").insert({ ...values, created_by: member?.userId ?? null, coach_name: member?.profile?.display_name || member?.email || null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(t(analysis ? "draft.updated" : "draft.created"));
      qc.invalidateQueries({ queryKey: ["draft-analyses"] });
      qc.invalidateQueries({ queryKey: ["visibility-items"] });
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
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle className="font-display text-2xl uppercase">{t(analysis ? "draft.edit" : "draft.new")}</DialogTitle><DialogDescription>{t("draft.visibilityHint")}</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="draft-title">{t("draft.title")}</Label><Input id="draft-title" required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="draft-opponent">{t("draft.opponent")}</Label><Input id="draft-opponent" maxLength={100} value={opponent} onChange={(event) => setOpponent(event.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="draft-date">{t("draft.date")}</Label><Input id="draft-date" type="date" required value={date} onChange={(event) => setDate(event.target.value)} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>{t("draft.player")}</Label><Select value={playerId} onValueChange={setPlayerId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={NONE}>{t("draft.team")}</SelectItem>{players.map((player) => <SelectItem key={player.id} value={player.id}>{player.nickname}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label htmlFor="draft-team-comp">{t("draft.teamComposition")}</Label><Textarea id="draft-team-comp" rows={2} maxLength={500} placeholder={t("ops.compositionHint")} value={teamComposition} onChange={(event) => setTeamComposition(event.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="draft-opponent-comp">{t("draft.opponentComposition")}</Label><Textarea id="draft-opponent-comp" rows={2} maxLength={500} placeholder={t("ops.compositionHint")} value={opponentComposition} onChange={(event) => setOpponentComposition(event.target.value)} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="draft-strategy">{t("draft.strategy")}</Label><Textarea id="draft-strategy" rows={4} maxLength={10000} value={strategy} onChange={(event) => setStrategy(event.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="draft-matchups">{t("draft.matchups")}</Label><Textarea id="draft-matchups" rows={4} maxLength={10000} value={matchups} onChange={(event) => setMatchups(event.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="draft-win">{t("draft.winConditions")}</Label><Textarea id="draft-win" rows={4} maxLength={10000} value={winConditions} onChange={(event) => setWinConditions(event.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="draft-positives">{t("draft.positives")}</Label><Textarea id="draft-positives" rows={4} maxLength={10000} value={positives} onChange={(event) => setPositives(event.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="draft-problems">{t("draft.problems")}</Label><Textarea id="draft-problems" rows={4} maxLength={10000} value={problems} onChange={(event) => setProblems(event.target.value)} /></div>
          <DialogFooter className="sm:col-span-2"><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="animate-spin" />}{mutation.isPending ? t("common.saving") : t("common.save")}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
