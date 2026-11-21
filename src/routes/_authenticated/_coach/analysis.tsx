import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, StageNotice } from "@/components/common/Page";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/_coach/analysis")({
  head: () => ({ meta: [{ title: "Analysis — ZILENCE" }] }),
  component: AnalysisPage,
});

function AnalysisPage() {
  const { t } = useI18n();
  return (
    <div className="fade-up">
      <PageHeader title={t("nav.analysis")} />
      <StageNotice stage={4} description="stage.analysis" />
    </div>
  );
}
