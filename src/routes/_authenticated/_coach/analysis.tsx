import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common/Page";
import { CoachNotesPanel } from "@/components/analysis/CoachNotesPanel";
import { VodReviewsPanel } from "@/components/analysis/VodReviewsPanel";
import { DraftAnalysisPanel } from "@/components/analysis/DraftAnalysisPanel";
import { DraftHistoryPanel } from "@/components/analysis/DraftHistoryPanel";
import { coachNotesQueryOptions, draftAnalysesQueryOptions, playersQueryOptions, scrimGamesQueryOptions, scrimSessionsQueryOptions, vodReviewsQueryOptions, vodTimestampsQueryOptions } from "@/lib/queries";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/_coach/analysis")({
  head: () => ({
    meta: [
      { title: "Analysis — ZILENCE" },
      { name: "description", content: "Coach Notes, VOD Review, Draft Analysis e histórico de escolhas da ZILENCE." },
      { property: "og:title", content: "Analysis — ZILENCE" },
      { property: "og:description", content: "Central de análise competitiva e privacidade da equipe ZILENCE." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(playersQueryOptions),
    context.queryClient.ensureQueryData(coachNotesQueryOptions),
    context.queryClient.ensureQueryData(vodReviewsQueryOptions),
    context.queryClient.ensureQueryData(vodTimestampsQueryOptions),
    context.queryClient.ensureQueryData(draftAnalysesQueryOptions),
    context.queryClient.ensureQueryData(scrimGamesQueryOptions),
    context.queryClient.ensureQueryData(scrimSessionsQueryOptions),
  ]),
  component: AnalysisPage,
});

function AnalysisPage() {
  const { t } = useI18n();
  return (
    <div className="fade-up">
      <PageHeader title={t("nav.analysis")} subtitle={t("analysis.subtitle")} />
      <Tabs defaultValue="notes">
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="notes">{t("analysis.coachNotes")}</TabsTrigger>
          <TabsTrigger value="vods">{t("analysis.vodReview")}</TabsTrigger>
          <TabsTrigger value="drafts">{t("analysis.draftAnalysis")}</TabsTrigger>
          <TabsTrigger value="history">{t("analysis.draftHistory")}</TabsTrigger>
        </TabsList>
        <TabsContent value="notes" className="mt-5"><CoachNotesPanel /></TabsContent>
        <TabsContent value="vods" className="mt-5"><VodReviewsPanel canEdit /></TabsContent>
        <TabsContent value="drafts" className="mt-5"><DraftAnalysisPanel canEdit /></TabsContent>
        <TabsContent value="history" className="mt-5"><DraftHistoryPanel /></TabsContent>
      </Tabs>
    </div>
  );
}
