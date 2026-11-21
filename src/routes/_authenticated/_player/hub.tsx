import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, StageNotice } from "@/components/common/Page";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/_player/hub")({
  head: () => ({ meta: [{ title: "Team Hub — ZILENCE" }] }),
  component: HubPage,
});

function HubPage() {
  const { t } = useI18n();
  return (
    <div className="fade-up">
      <PageHeader title={t("nav.teamHub")} />
      <StageNotice stage={3} description="stage.teamHub" />
    </div>
  );
}
