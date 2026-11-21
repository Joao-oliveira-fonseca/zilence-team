import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, StageNotice } from "@/components/common/Page";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/_coach/team")({
  head: () => ({ meta: [{ title: "Team Management — ZILENCE" }] }),
  component: TeamPage,
});

function TeamPage() {
  const { t } = useI18n();
  return (
    <div className="fade-up">
      <PageHeader title={t("nav.team")} />
      <StageNotice stage={5} description="stage.team" />
    </div>
  );
}
