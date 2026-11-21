import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/Page";
import { AccountSettings } from "@/components/common/AccountSettings";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/_coach/settings")({
  head: () => ({ meta: [{ title: "Settings — ZILENCE" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t } = useI18n();
  return (
    <div className="fade-up">
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />
      <AccountSettings />
    </div>
  );
}
