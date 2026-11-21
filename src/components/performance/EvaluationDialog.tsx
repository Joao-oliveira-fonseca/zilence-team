import { useEffect, useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Stars } from "@/components/common/Stars";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, CATEGORY_KEYS, categoryAverage, formatRating, overallRating, type Scores } from "@/lib/evaluation";
import { memberQueryOptions, type Player } from "@/lib/member";
import { useI18n, type TranslationKey } from "@/i18n";

export function EvaluationDialog({ player, open, onOpenChange }: { player: Player; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: member } = useSuspenseQuery(memberQueryOptions);
  const [scores, setScores] = useState<Scores>({});
  const [comments, setComments] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setScores({});
      setComments({});
    }
  }, [open]);

  const overall = overallRating(scores);

  const mutation = useMutation({
    mutationFn: async () => {
      const clean: Record<string, string> = {};
      for (const [k, v] of Object.entries(comments)) if (v.trim()) clean[k] = v.trim().slice(0, 2000);
      const { error } = await supabase.from("player_evaluations").insert({
        player_id: player.id,
        coach_id: member?.userId ?? null,
        coach_name: member?.profile?.display_name ?? member?.email ?? null,
        scores,
        comments: clean,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("eval.saved"));
      qc.invalidateQueries({ queryKey: ["evaluations"] });
      onOpenChange(false);
    },
    onError: () => toast.error(t("common.error")),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-4 font-display text-2xl uppercase">
            {t("eval.title", { name: player.nickname })}
            <span className="mr-6 text-primary tabular">{formatRating(overall)}</span>
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="macro">
          <TabsList className="flex h-auto w-full flex-wrap">
            {CATEGORY_KEYS.map((c) => (
              <TabsTrigger key={c} value={c} className="flex-1 gap-1.5">
                {t(`cat.${c}` as TranslationKey)}
                <span className="text-xs text-primary tabular">{formatRating(categoryAverage(scores, c))}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          {CATEGORY_KEYS.map((c) => (
            <TabsContent key={c} value={c} className="mt-4 space-y-1">
              {CATEGORIES[c].map((crit) => {
                const key = `${c}.${crit}`;
                const label = t(`crit.${key}` as TranslationKey);
                return (
                  <div key={key} className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-surface">
                    <span className="text-sm">{label}</span>
                    <Stars
                      value={scores[key] ?? null}
                      label={label}
                      onChange={(v) =>
                        setScores((s) => {
                          const next = { ...s };
                          if (v === 0) delete next[key];
                          else next[key] = v;
                          return next;
                        })
                      }
                    />
                  </div>
                );
              })}
              <Textarea
                className="mt-3"
                rows={3}
                maxLength={2000}
                placeholder={t("eval.comments")}
                value={comments[c] ?? ""}
                onChange={(e) => setComments((s) => ({ ...s, [c]: e.target.value }))}
              />
            </TabsContent>
          ))}
        </Tabs>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button
            disabled={mutation.isPending}
            onClick={() => (overall === null ? toast.error(t("eval.needScore")) : mutation.mutate())}
          >
            {mutation.isPending && <Loader2 className="animate-spin" />}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
