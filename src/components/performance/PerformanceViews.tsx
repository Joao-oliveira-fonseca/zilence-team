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
type Metric = "all" | "overall" | Category;

function metricValue(evaluation: Evaluation, metric: Exclude<Metric, "all">) {
  const value = metric === "overall" ? evaluation.overall : evaluation[avgField[metric]];
  return value === null ? null : Number(value);
}

export function EvolutionChart({ evaluations }: { evaluations: Evaluation[] }) {
  const { t, locale } = useI18n();
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("all");
  const [metric, setMetric] = useState<Metric>("overall");
  const comparisonMetric = metric === "all" ? "overall" : metric;
  const { series, currentAverage, previousAverage, hasPrevious } = useMemo(() => {
    const ordered = [...evaluations].reverse();
    const duration = period === "all" ? 0 : Number(period) * 86400000;
    const since = period === "all" ? 0 : Date.now() - duration;
    const current = ordered.filter((evaluation) => new Date(evaluation.evaluated_at).getTime() >= since);
    const previous = period === "all" ? [] : ordered.filter((evaluation) => {
      const time = new Date(evaluation.evaluated_at).getTime();
      return time >= since - duration && time < since;
    });
    const toPoint = (evaluation: Evaluation) => ({
      date: new Date(evaluation.evaluated_at).toLocaleDateString(locale, { day: "2-digit", month: "short" }),
      overall: metricValue(evaluation, "overall"),
      ...Object.fromEntries(CATEGORY_KEYS.map((category) => [category, metricValue(evaluation, category)])),
    });
    const currentPoints = current.map(toPoint);
    const previousPoints = previous.map(toPoint);
    const length = Math.max(currentPoints.length, previousPoints.length);
    const chartSeries = Array.from({ length }, (_, index) => {
      const currentPoint = currentPoints[index];
      const previousPoint = previousPoints[index];
      const previousEvaluation = previous[index];
      return {
        ...currentPoint,
        date: currentPoint?.date ?? previousPoint?.date ?? "",
        previous: previousEvaluation ? metricValue(previousEvaluation, comparisonMetric) : null,
      };
    });
    const average = (items: Evaluation[]) => {
      const values = items.map((evaluation) => metricValue(evaluation, comparisonMetric)).filter((value): value is number => value !== null);
      return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    };
    return { series: chartSeries, currentAverage: average(current), previousAverage: average(previous), hasPrevious: previous.length > 0 };
  }, [evaluations, period, locale, comparisonMetric]);
  const colors = ["var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--destructive)"];
  return (
    <div className="rounded-md border border-border bg-surface p-3">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="eyebrow">{t("eval.evolution")}</p>
        <div className="flex flex-wrap gap-2">
          <Select value={metric} onValueChange={(value) => setMetric(value as Metric)}>
            <SelectTrigger className="h-8 w-full sm:w-44" aria-label={t("eval.metric")}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="overall">{t("eval.metric.overall")}</SelectItem>
              <SelectItem value="all">{t("eval.metric.all")}</SelectItem>
              {CATEGORY_KEYS.map((category) => <SelectItem key={category} value={category}>{t(`cat.${category}` as TranslationKey)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={(value) => setPeriod(value as typeof period)}>
            <SelectTrigger className="h-8 w-32" aria-label={t("eval.period")}><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERIODS.map((value) => <SelectItem key={value} value={value}>{t(`eval.period.${value}` as TranslationKey)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      {period !== "all" && (
        <div className="mb-3 rounded-md border border-border bg-background p-3">
          <p className="eyebrow">{t("eval.comparison")}</p>
          {hasPrevious ? (
            <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
              <div><p className="text-xs text-muted-foreground">{t("eval.currentPeriod")}</p><p className="font-display text-2xl font-bold text-primary tabular">{formatRating(currentAverage)}</p></div>
              <div><p className="text-xs text-muted-foreground">{t("eval.previousPeriod")}</p><p className="font-display text-2xl font-bold tabular">{formatRating(previousAverage)}</p></div>
              <div><p className="text-xs text-muted-foreground">Δ</p><p className="font-display text-2xl font-bold tabular">{currentAverage !== null && previousAverage !== null ? `${currentAverage - previousAverage >= 0 ? "+" : ""}${(currentAverage - previousAverage).toFixed(2)}` : "—"}</p></div>
            </div>
          ) : <p className="mt-2 text-xs text-muted-foreground">{t("eval.noPrevious")}</p>}
        </div>
      )}
      <div className="h-64 sm:h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} stroke="var(--muted-foreground)" fontSize={11} width={24} />
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {metric === "all" ? (
              <>
                <Line type="monotone" dataKey="overall" name="Overall" stroke="var(--primary)" strokeWidth={2.5} dot connectNulls />
                {CATEGORY_KEYS.map((category, index) => <Line key={category} type="monotone" dataKey={category} name={t(`cat.${category}` as TranslationKey)} stroke={colors[index]} strokeWidth={1} dot={false} connectNulls />)}
              </>
            ) : <Line type="monotone" dataKey={metric} name={metric === "overall" ? "Overall" : t(`cat.${metric}` as TranslationKey)} stroke="var(--primary)" strokeWidth={2.5} dot connectNulls />}
            {period !== "all" && hasPrevious && <Line type="monotone" dataKey="previous" name={t("eval.previousPeriod")} stroke="var(--muted-foreground)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} connectNulls />}
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
