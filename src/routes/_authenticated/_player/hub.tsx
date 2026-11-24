import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common/Page";
import { CalendarView } from "@/components/operations/CalendarView";
import { ScrimsPanel } from "@/components/operations/ScrimsPanel";
import { TasksPanel } from "@/components/operations/TasksPanel";
import { VodReviewsPanel } from "@/components/analysis/VodReviewsPanel";
import { DraftAnalysisPanel } from "@/components/analysis/DraftAnalysisPanel";
import { calendarEventsQueryOptions, draftAnalysesQueryOptions, playersQueryOptions, scrimGamesQueryOptions, scrimSessionsQueryOptions, tasksQueryOptions, vodReviewsQueryOptions, vodTimestampsQueryOptions } from "@/lib/queries";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/_player/hub")({
  head: () => ({
    meta: [
      { title: "Team Hub — ZILENCE" },
      { name: "description", content: "Calendário, tarefas, VODs, drafts e resultados compartilhados com o jogador ZILENCE." },
      { property: "og:title", content: "Team Hub — ZILENCE" },
      { property: "og:description", content: "Rotina competitiva compartilhada pela comissão da ZILENCE." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(playersQueryOptions),
    context.queryClient.ensureQueryData(calendarEventsQueryOptions),
    context.queryClient.ensureQueryData(scrimSessionsQueryOptions),
    context.queryClient.ensureQueryData(scrimGamesQueryOptions),
    context.queryClient.ensureQueryData(tasksQueryOptions),
    context.queryClient.ensureQueryData(vodReviewsQueryOptions),
    context.queryClient.ensureQueryData(vodTimestampsQueryOptions),
    context.queryClient.ensureQueryData(draftAnalysesQueryOptions),
  ]),
  component: HubPage,
});

function HubPage() {
  const { t } = useI18n();
  const { data: players } = useSuspenseQuery(playersQueryOptions);
  const { data: events } = useSuspenseQuery(calendarEventsQueryOptions);
  return (
    <div className="fade-up">
      <PageHeader title={t("nav.teamHub")} subtitle={t("ops.hubSubtitle")} />
      <Tabs defaultValue="calendar">
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="calendar">{t("ops.calendar")}</TabsTrigger>
          <TabsTrigger value="tasks">{t("player.myTasks")}</TabsTrigger>
          <TabsTrigger value="vods">{t("ops.vodReviews")}</TabsTrigger>
          <TabsTrigger value="drafts">{t("analysis.draftAnalysis")}</TabsTrigger>
          <TabsTrigger value="scrims">{t("ops.sharedScrims")}</TabsTrigger>
        </TabsList>
        <TabsContent value="calendar" className="mt-5"><CalendarView events={events} players={players} notes={[]} canEdit={false} /></TabsContent>
        <TabsContent value="tasks" className="mt-5"><TasksPanel canEdit={false} /></TabsContent>
        <TabsContent value="vods" className="mt-5"><VodReviewsPanel canEdit={false} /></TabsContent>
        <TabsContent value="drafts" className="mt-5"><DraftAnalysisPanel canEdit={false} /></TabsContent>
        <TabsContent value="scrims" className="mt-5"><ScrimsPanel canEdit={false} /></TabsContent>
      </Tabs>
    </div>
  );
}
