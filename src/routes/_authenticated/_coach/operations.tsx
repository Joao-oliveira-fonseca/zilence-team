import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common/Page";
import { CalendarView } from "@/components/operations/CalendarView";
import { ScrimsPanel } from "@/components/operations/ScrimsPanel";
import { TasksPanel } from "@/components/operations/TasksPanel";
import { calendarEventsQueryOptions, eventPrivateNotesQueryOptions, playersQueryOptions, scrimGamesQueryOptions, scrimPrivateNotesQueryOptions, scrimSessionsQueryOptions, tasksQueryOptions } from "@/lib/queries";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/_coach/operations")({
  head: () => ({
    meta: [
      { title: "Team Operations — ZILENCE" },
      { name: "description", content: "Calendário competitivo, scrims e tarefas da equipe ZILENCE." },
      { property: "og:title", content: "Team Operations — ZILENCE" },
      { property: "og:description", content: "Gestão da rotina competitiva da ZILENCE." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(playersQueryOptions),
    context.queryClient.ensureQueryData(calendarEventsQueryOptions),
    context.queryClient.ensureQueryData(eventPrivateNotesQueryOptions),
    context.queryClient.ensureQueryData(scrimSessionsQueryOptions),
    context.queryClient.ensureQueryData(scrimGamesQueryOptions),
    context.queryClient.ensureQueryData(scrimPrivateNotesQueryOptions),
    context.queryClient.ensureQueryData(tasksQueryOptions),
  ]),
  component: OperationsPage,
});

function OperationsPage() {
  const { t } = useI18n();
  const { data: players } = useSuspenseQuery(playersQueryOptions);
  const { data: events } = useSuspenseQuery(calendarEventsQueryOptions);
  const { data: notes } = useSuspenseQuery(eventPrivateNotesQueryOptions);
  return (
    <div className="fade-up">
      <PageHeader title={t("nav.operations")} subtitle={t("ops.subtitle")} />
      <Tabs defaultValue="calendar">
        <TabsList className="grid h-auto w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="calendar">{t("ops.calendar")}</TabsTrigger>
          <TabsTrigger value="scrims">{t("ops.scrims")}</TabsTrigger>
          <TabsTrigger value="tasks">{t("ops.tasks")}</TabsTrigger>
        </TabsList>
        <TabsContent value="calendar" className="mt-5"><CalendarView events={events} players={players} notes={notes} canEdit /></TabsContent>
        <TabsContent value="scrims" className="mt-5"><ScrimsPanel canEdit /></TabsContent>
        <TabsContent value="tasks" className="mt-5"><TasksPanel canEdit /></TabsContent>
      </Tabs>
    </div>
  );
}
