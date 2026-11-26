import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader, PlayerAvatar, PositionBadge, Section, StatCard } from "@/components/common/Page";
import { recentEvaluationsQueryOptions, pendingAccountsQueryOptions, playersQueryOptions, tasksQueryOptions, upcomingEventsQueryOptions } from "@/lib/queries";
import { POSITIONS, TASK_STATUSES, effectiveTaskStatus } from "@/lib/constants";
import { useI18n } from "@/i18n";
import { formatRating } from "@/lib/evaluation";

export const Route = createFileRoute("/_authenticated/_coach/overview")({
  head: () => ({
    meta: [
      { title: "Overview — ZILENCE" },
      { name: "description", content: "Visão geral da equipe ZILENCE." },
      { property: "og:title", content: "Overview — ZILENCE" },
      { property: "og:description", content: "Indicadores, evolução e próximas atividades da equipe ZILENCE." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(playersQueryOptions),
      context.queryClient.ensureQueryData(upcomingEventsQueryOptions),
      context.queryClient.ensureQueryData(tasksQueryOptions),
      context.queryClient.ensureQueryData(pendingAccountsQueryOptions),
      context.queryClient.ensureQueryData(recentEvaluationsQueryOptions),
    ]),
  component: Overview,
});

function Overview() {
  const { t, locale } = useI18n();
  const { data: players } = useSuspenseQuery(playersQueryOptions);
  const { data: events } = useSuspenseQuery(upcomingEventsQueryOptions);
  const { data: tasks } = useSuspenseQuery(tasksQueryOptions);
  const { data: pending } = useSuspenseQuery(pendingAccountsQueryOptions);

  const { data: evals } = useSuspenseQuery(recentEvaluationsQueryOptions);
  // Team average = mean of each player's latest Overall Rating.
  const latestByPlayer = new Map<string, number>();
  for (const e of evals) if (e.overall !== null && !latestByPlayer.has(e.player_id)) latestByPlayer.set(e.player_id, Number(e.overall));
  const teamAvg = latestByPlayer.size ? [...latestByPlayer.values()].reduce((a, b) => a + b, 0) / latestByPlayer.size : null;
  const dailyRatings = new Map<string, { sum: number; count: number }>();
  for (const evaluation of [...evals].reverse()) {
    if (evaluation.overall === null) continue;
    const day = evaluation.evaluated_at.slice(0, 10);
    const current = dailyRatings.get(day) ?? { sum: 0, count: 0 };
    current.sum += Number(evaluation.overall);
    current.count += 1;
    dailyRatings.set(day, current);
  }
  const teamEvolution = [...dailyRatings.entries()].map(([day, value]) => ({
    date: new Date(`${day}T12:00:00`).toLocaleDateString(locale, { day: "2-digit", month: "short" }),
    overall: Number((value.sum / value.count).toFixed(2)),
  }));
  const nick = (id: string) => players.find((p) => p.id === id)?.nickname ?? "—";
  const active = players.filter((p) => p.status === "active");
  const taskCounts = TASK_STATUSES.map((status) => ({
    status,
    count: tasks.filter((task) => effectiveTaskStatus(task) === status).length,
  }));
  const openTasks = taskCounts.filter((c) => c.status !== "completed").reduce((sum, c) => sum + c.count, 0);
  const fmt = new Intl.DateTimeFormat(locale, { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="fade-up">
      <PageHeader
        title={t("overview.title")}
        subtitle={t("overview.subtitle")}
        actions={
          <Button asChild>
            <Link to="/players" search={{ new: true }}>
              <Plus />
              {t("players.add")}
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t("overview.kpiPlayers")} value={players.length} hint={`${active.length} ${t("overview.kpiActive").toLowerCase()}`} accent />
        <StatCard label={t("overview.kpiEvents")} value={events.length} hint={`${pending.length} ${t("overview.kpiPendingAccounts").toLowerCase()}`} />
        <StatCard label={t("overview.kpiTasks")} value={openTasks} />
        <StatCard label={t("overview.kpiAverage")} value={formatRating(teamAvg)} hint={t("eval.count", { n: evals.length })} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {teamEvolution.length > 0 && (
          <Section title={t("overview.teamEvolution")} className="lg:col-span-3">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={teamEvolution} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} stroke="var(--muted-foreground)" fontSize={11} width={24} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6 }} />
                  <Line type="monotone" dataKey="overall" name="Overall Rating" stroke="var(--primary)" strokeWidth={2.5} dot connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Section>
        )}
        <Section
          title={t("overview.playersOverview")}
          className="lg:col-span-2"
          action={
            <Link to="/players" className="text-xs text-muted-foreground hover:text-primary">
              {t("common.viewAll")}
            </Link>
          }
        >
          {players.length === 0 ? (
            <EmptyState
              text={t("overview.noPlayers")}
              action={
                <Button asChild variant="soft" size="sm">
                  <Link to="/players" search={{ new: true }}>{t("overview.addFirst")}</Link>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-2 sm:grid-cols-5">
              {POSITIONS.map((pos) => {
                const starter = active.find((p) => p.main_position === pos) ?? players.find((p) => p.main_position === pos);
                return (
                  <div key={pos} className="rounded-md border border-border bg-surface p-3">
                    <p className="eyebrow text-primary">{pos}</p>
                    {starter ? (
                      <Link to="/players" search={{ player: starter.id }} className="mt-3 flex items-center gap-2 hover:text-primary">
                        <PlayerAvatar nickname={starter.nickname} url={starter.avatar_url} className="size-8" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{starter.nickname}</p>
                          <p className="truncate text-xs text-muted-foreground">{starter.elo ?? "—"}</p>
                        </div>
                      </Link>
                    ) : (
                      <p className="mt-3 text-xs text-muted-foreground">{t("overview.open")}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {players.length > 0 && (
            <ul className="mt-4 divide-y divide-border">
              {players.slice(0, 8).map((p) => (
                <li key={p.id}>
                  <Link to="/players" search={{ player: p.id }} className="flex items-center gap-3 py-2.5 hover:text-primary">
                    <PlayerAvatar nickname={p.nickname} url={p.avatar_url} />
                    <span className="flex-1 truncate font-medium">{p.nickname}</span>
                    <PositionBadge position={p.main_position} />
                    <span className="hidden w-28 truncate text-right text-sm text-muted-foreground sm:block">{p.elo ?? "—"}</span>
                    <Badge variant="muted">{t(`status.${p.status}`)}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title={t("overview.upcoming")}>
          {events.length === 0 ? (
            <EmptyState text={t("overview.noEvents")} />
          ) : (
            <ul className="space-y-3">
              {events.map((e) => (
                <li key={e.id} className="flex gap-3">
                  <CalendarDays className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{e.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {t(`event.${e.event_type}`)} · {fmt.format(new Date(e.starts_at))}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title={t("overview.recentEvals")}>
          {evals.length === 0 ? (
            <EmptyState text={t("eval.none")} />
          ) : (
            <ul className="space-y-2">
              {evals.slice(0, 6).map((e) => (
                <li key={e.id}>
                  <Link to="/players" search={{ player: e.player_id }} className="flex items-center gap-3 hover:text-primary">
                    <span className="w-10 font-display text-xl font-bold text-primary tabular">{formatRating(e.overall)}</span>
                    <span className="flex-1 truncate text-sm font-medium">{nick(e.player_id)}</span>
                    <span className="text-xs text-muted-foreground">{new Date(e.evaluated_at).toLocaleDateString(locale)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title={t("overview.taskOverview")} className="lg:col-span-2">
          {tasks.length === 0 ? (
            <EmptyState text={t("overview.noTasks")} />
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {taskCounts.map((c) => (
                <div key={c.status} className="rounded-md border border-border bg-surface p-3">
                  <p className="eyebrow">{t(`task.${c.status}`)}</p>
                  <p className="mt-1 font-display text-3xl font-bold tabular">{c.count}</p>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
