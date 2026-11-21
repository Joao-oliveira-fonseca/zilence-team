import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/common/Page";
import { Stars } from "@/components/common/Stars";
import { EvaluationDialog } from "./EvaluationDialog";
import { supabase } from "@/integrations/supabase/client";
import { evaluationsQueryOptions } from "@/lib/queries";
import { CATEGORIES, CATEGORY_KEYS, formatRating, type Category } from "@/lib/evaluation";
import type { Database } from "@/integrations/supabase/types";
import type { Player } from "@/lib/member";
import { useI18n, type TranslationKey } from "@/i18n";

type Evaluation = Database["public"]["Tables"]["player_evaluations"]["Row"];
const avgField: Record<Category, keyof Evaluation> = {
  macro: "macro_avg",
  micro: "micro_avg",
  teamplay: "teamplay_avg",
  knowledge: "knowledge_avg",
  mental: "mental_avg",
};

function useEvaluations(playerId: string) {
  return useQuery(evaluationsQueryOptions(playerId));
}

export function EvaluationSummary({ evaluation }: { evaluation: Evaluation }) {
  const { t, locale } = useI18n();
  const scores = (evaluation.scores ?? {}) as Record<string, number>;
  const comments = (evaluation.comments ?? {}) as Record<string, string>;
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between rounded-md border border-primary/40 bg-primary-soft p-4">
        <div>
          <p className="eyebrow text-primary">{t("eval.overall")}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(evaluation.evaluated_at).toLocaleDateString(locale)}
            {evaluation.coach_name ? ` · ${t("eval.by", { coach: evaluation.coach_name })}` : ""}
          </p>
        </div>
        <p className="font-display text-5xl font-bold text-primary tabular">
          {formatRating(evaluation.overall)}
          <span className="text-lg text-muted-foreground">/5</span>
        </p>
      </div>
      {CATEGORY_KEYS.map((c) => {
        const v = evaluation[avgField[c]] as number | null;
        return (
          <details key={c} className="group rounded-md border border-border bg-surface">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5">
              <span className="flex-1 font-display text-sm font-semibold uppercase tracking-wider">{t(`cat.${c}` as TranslationKey)}</span>
              <div className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-secondary sm:block">
                <div className="h-full bg-primary" style={{ width: `${((Number(v) || 0) / 5) * 100}%` }} />
              </div>
              <span className="w-8 text-right font-display font-bold tabular">{formatRating(v)}</span>
            </summary>
            <div className="space-y-1 border-t border-border px-3 py-2">
              {CATEGORIES[c].map((crit) => (
                <div key={crit} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t(`crit.${c}.${crit}` as TranslationKey)}</span>
                  <Stars value={scores[`${c}.${crit}`] ?? null} size="sm" />
                </div>
              ))}
              {comments[c] && <p className="mt-2 whitespace-pre-wrap rounded bg-background p-2 text-sm">{comments[c]}</p>}
            </div>
          </details>
        );
      })}
    </div>
  );
}

export function PerformanceTab({ player, editable }: { player: Player; editable: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const { data = [], isLoading } = useEvaluations(player.id);
  const latest = data[0];
  return (
    <div className="space-y-4">
      {editable && (
        <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
          <Plus />
          {t("eval.new")}
        </Button>
      )}
      {isLoading ? (
        <Loader2 className="mx-auto animate-spin text-muted-foreground" />
      ) : latest ? (
        <EvaluationSummary evaluation={latest} />
      ) : (
        <EmptyState text={t("eval.none")} />
      )}
      {editable && <EvaluationDialog player={player} open={open} onOpenChange={setOpen} />}
    </div>
  );
}

const PERIODS = ["all", "30", "90", "365"] as const;

export function EvolutionChart({ evaluations }: { evaluations: Evaluation[] }) {
  const { t, locale } = useI18n();
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("all");
  const series = useMemo(() => {
    const since = period === "all" ? 0 : Date.now() - Number(period) * 86400000;
    return [...evaluations]
      .filter((e) => new Date(e.evaluated_at).getTime() >= since)
      .reverse()
      .map((e) => ({
        date: new Date(e.evaluated_at).toLocaleDateString(locale, { day: "2-digit", month: "short" }),
        overall: Number(e.overall),
        ...Object.fromEntries(CATEGORY_KEYS.map((c) => [c, e[avgField[c]] === null ? null : Number(e[avgField[c]])])),
      }));
  }, [evaluations, period, locale]);
  const colors = ["var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--destructive)"];
  return (
    <div className="rounded-md border border-border bg-surface p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="eyebrow">{t("eval.evolution")}</p>
        <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <SelectTrigger className="h-8 w-32" aria-label={t("eval.period")}><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => <SelectItem key={p} value={p}>{t(`eval.period.${p}` as TranslationKey)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} stroke="var(--muted-foreground)" fontSize={11} width={24} />
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="overall" name="Overall" stroke="var(--primary)" strokeWidth={2.5} dot />
            {CATEGORY_KEYS.map((c, i) => (
              <Line key={c} type="monotone" dataKey={c} name={t(`cat.${c}` as TranslationKey)} stroke={colors[i]} strokeWidth={1} dot={false} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function HistoryTab({ player, editable }: { player: Player; editable: boolean }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const { data = [], isLoading } = useEvaluations(player.id);
  const [openId, setOpenId] = useState<string | null>(null);
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("player_evaluations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("eval.deleted"));
      qc.invalidateQueries({ queryKey: ["evaluations"] });
    },
    onError: () => toast.error(t("common.error")),
  });
  if (isLoading) return <Loader2 className="mx-auto animate-spin text-muted-foreground" />;
  if (data.length === 0) return <EmptyState text={t("eval.none")} />;
  return (
    <div className="space-y-4">
      <EvolutionChart evaluations={data} />
      <ul className="divide-y divide-border rounded-md border border-border">
        {data.map((e) => (
          <li key={e.id}>
            <div className="flex items-center gap-3 px-3 py-2.5">
              <button className="flex flex-1 items-center gap-3 text-left" onClick={() => setOpenId(openId === e.id ? null : e.id)}>
                <span className="font-display text-xl font-bold text-primary tabular">{formatRating(e.overall)}</span>
                <span className="text-sm">{new Date(e.evaluated_at).toLocaleDateString(locale)}</span>
                {e.coach_name && <span className="truncate text-xs text-muted-foreground">{t("eval.by", { coach: e.coach_name })}</span>}
              </button>
              {editable && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("eval.delete")}
                  onClick={() => window.confirm(t("eval.delete") + "?") && del.mutate(e.id)}
                >
                  <Trash2 />
                </Button>
              )}
            </div>
            {openId === e.id && (
              <div className="px-3 pb-3">
                <EvaluationSummary evaluation={e} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
