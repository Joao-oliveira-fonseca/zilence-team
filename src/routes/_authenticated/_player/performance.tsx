import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, StageNotice } from "@/components/common/Page";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/_player/performance")({
  head: () => ({ meta: [{ title: "My Performance — ZILENCE" }] }),
  component: PerformancePage,
});

function PerformancePage() {
  const { t } = useI18n();
  return (
    <div className="fade-up">
      <PageHeader title={t("nav.myPerformance")} />
      <StageNotice stage={2} description="stage.myPerformance" />
    </div>
  );
}
