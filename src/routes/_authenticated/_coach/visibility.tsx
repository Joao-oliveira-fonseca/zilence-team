import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, StageNotice } from "@/components/common/Page";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/_coach/visibility")({
  head: () => ({ meta: [{ title: "Visibility Control — ZILENCE" }] }),
  component: VisibilityPage,
});

function VisibilityPage() {
  const { t } = useI18n();
  return (
    <div className="fade-up">
      <PageHeader title={t("nav.visibility")} />
      <StageNotice stage={4} description="stage.visibility" />
    </div>
  );
}
