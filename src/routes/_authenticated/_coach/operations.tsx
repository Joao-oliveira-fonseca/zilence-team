import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, StageNotice } from "@/components/common/Page";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/_coach/operations")({
  head: () => ({ meta: [{ title: "Team Operations — ZILENCE" }] }),
  component: OperationsPage,
});

function OperationsPage() {
  const { t } = useI18n();
  return (
    <div className="fade-up">
      <PageHeader title={t("nav.operations")} />
      <StageNotice stage={3} description="stage.operations" />
    </div>
  );
}
