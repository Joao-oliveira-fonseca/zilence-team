import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, ExternalLink, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, PlayerAvatar, PositionBadge, Section } from "@/components/common/Page";
import { memberQueryOptions } from "@/lib/member";
import { evaluationsQueryOptions, tasksQueryOptions, upcomingEventsQueryOptions, vodReviewsQueryOptions } from "@/lib/queries";
import { videoAtTimestamp } from "@/lib/analysis";
import { formatRating } from "@/lib/evaluation";
import { effectiveTaskStatus } from "@/lib/constants";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/_player/dashboard")({
  head: () => ({ meta: [{ title: "My Dashboard — ZILENCE" }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(upcomingEventsQueryOptions),
      context.queryClient.ensureQueryData(tasksQueryOptions),
      context.queryClient.ensureQueryData(vodReviewsQueryOptions),
    ]),
  component: PlayerDashboard,
});

function PlayerDashboard() {
  const { t, locale } = useI18n();
  const { data: member } = useSuspenseQuery(memberQueryOptions);
  const { data: events } = useSuspenseQuery(upcomingEventsQueryOptions);
  const { data: tasks } = useSuspenseQuery(tasksQueryOptions);
  const { data: vodReviews } = useSuspenseQuery(vodReviewsQueryOptions);
  const player = member?.player;
  const { data: evals = [] } = useQuery({ ...evaluationsQueryOptions(player?.id ?? ""), enabled: Boolean(player) });
  const latest = evals[0];
  const openTasks = tasks.filter((task) => effectiveTaskStatus(task) !== "completed");
  const fmt = new Intl.DateTimeFormat(locale, { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  const dateFmt = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" });

  if (!player) {
    return <EmptyState text={t("player.notLinked")} />;
  }

  return (
    <div className="fade-up">
      <PageHeader title={t("player.greeting", { name: player.nickname })} subtitle={t("player.subtitle")} />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="panel relative overflow-hidden p-5 lg:col-span-2">
          <div className="flex items-center gap-4">
            <PlayerAvatar nickname={player.nickname} url={player.avatar_url} className="size-20" />
            <div className="min-w-0">
              <p className="font-display text-4xl font-bold uppercase leading-none">{player.nickname}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <PositionBadge position={player.main_position} />
                {player.secondary_position && <PositionBadge position={player.secondary_position} secondary />}
                <Badge variant="muted">{player.elo ?? "—"}</Badge>
                {player.region && <Badge variant="muted">{player.region}</Badge>}
              </div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-md border border-border bg-surface p-3">
              <p className="eyebrow">{t("player.overall")}</p>
              <p className="mt-1 font-display text-4xl font-bold text-primary tabular">{formatRating(latest?.overall)}</p>
            </div>
            <div className="rounded-md border border-border bg-surface p-3">
              <p className="eyebrow">{t("player.lastEvaluation")}</p>
              <p className="mt-2 text-sm text-muted-foreground">{latest ? new Date(latest.evaluated_at).toLocaleDateString(locale) : t("player.noEvaluation")}</p>
            </div>
          </div>
        </section>

        <Section title={t("player.upcoming")}>
          {events.length === 0 ? (
            <EmptyState text={t("overview.noEvents")} />
          ) : (
            <ul className="space-y-3">
              {events.map((e) => (
                <li key={e.id} className="flex gap-3">
                  <CalendarDays className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{e.title}</p>
                    <p className="text-xs text-muted-foreground">{t(`event.${e.event_type}`)} · {fmt.format(new Date(e.starts_at))}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title={t("player.myTasks")} className="lg:col-span-3">
          {openTasks.length === 0 ? (
            <EmptyState text={t("player.noTasks")} />
          ) : (
            <ul className="divide-y divide-border">
              {openTasks.map((task) => {
                const status = effectiveTaskStatus(task);
                return (
                  <li key={task.id} className="flex items-center gap-3 py-2.5">
                    <CheckCircle2 className="size-4 text-muted-foreground" />
                    <span className="flex-1 truncate text-sm font-medium">{task.title}</span>
                    {task.due_at && <span className="text-xs text-muted-foreground">{t("player.due", { date: dateFmt.format(new Date(task.due_at)) })}</span>}
                    <Badge variant={task.priority === "urgent" || task.priority === "high" ? "soft" : "muted"}>{t(`priority.${task.priority}`)}</Badge>
                    <Badge variant={status === "overdue" ? "destructive" : "muted"}>{t(`task.${status}`)}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section title={t("ops.vodReviews")} className="lg:col-span-3">
          {vodReviews.length === 0 ? <EmptyState text={t("vod.empty")} /> : <ul className="divide-y divide-border">{vodReviews.slice(0, 4).map((review) => <li key={review.id} className="flex items-center gap-3 py-2.5"><Video className="size-4 shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{review.title}</p><p className="text-xs text-muted-foreground">{review.opponent ?? review.match_label ?? new Date(`${review.review_date}T12:00:00`).toLocaleDateString(locale)}</p></div><Badge variant="muted">{t(`vodCat.${review.category}`)}</Badge><Button variant="ghost" size="icon" asChild aria-label={t("vod.openVideo")}><a href={videoAtTimestamp(review.video_url, 0)} target="_blank" rel="noreferrer"><ExternalLink /></a></Button></li>)}</ul>}
        </Section>
      </div>
    </div>
  );
}
