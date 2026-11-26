import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/Page";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamAuditLog } from "@/components/team/TeamAuditLog";
import { TeamIdentity } from "@/components/team/TeamIdentity";
import { TeamMembers } from "@/components/team/TeamMembers";
import { auditLogQueryOptions, pendingAccountsQueryOptions, playersQueryOptions, profilesQueryOptions, teamSettingsQueryOptions, userRolesQueryOptions } from "@/lib/queries";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/_coach/team")({
  head: () => ({
    meta: [
      { title: "Team Management — ZILENCE" },
      { name: "description", content: "Identidade, integrantes, coaches e permissões da equipe ZILENCE." },
      { property: "og:title", content: "Team Management — ZILENCE" },
      { property: "og:description", content: "Gestão administrativa da organização ZILENCE." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(teamSettingsQueryOptions),
      context.queryClient.ensureQueryData(playersQueryOptions),
      context.queryClient.ensureQueryData(profilesQueryOptions),
      context.queryClient.ensureQueryData(userRolesQueryOptions),
      context.queryClient.ensureQueryData(pendingAccountsQueryOptions),
      context.queryClient.ensureQueryData(auditLogQueryOptions),
    ]),
  component: TeamPage,
});

function TeamPage() {
  const { t } = useI18n();
  return (
    <div className="fade-up">
      <PageHeader title={t("nav.team")} subtitle={t("team.subtitle")} />
      <Tabs defaultValue="identity">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="identity">{t("team.identity")}</TabsTrigger>
          <TabsTrigger value="members">{t("team.membersAndPermissions")}</TabsTrigger>
          <TabsTrigger value="audit">{t("team.audit")}</TabsTrigger>
        </TabsList>
        <TabsContent value="identity" className="mt-4"><TeamIdentity /></TabsContent>
        <TabsContent value="members" className="mt-4"><TeamMembers /></TabsContent>
        <TabsContent value="audit" className="mt-4"><TeamAuditLog /></TabsContent>
      </Tabs>
    </div>
  );
}
