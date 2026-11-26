import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { PageHeader, PlayerAvatar, PositionBadge, Section } from "@/components/common/Page";
import { AccountSettings } from "@/components/common/AccountSettings";
import { memberQueryOptions } from "@/lib/member";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/_player/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — ZILENCE" },
      { name: "description", content: "Perfil, dados competitivos e preferências do jogador ZILENCE." },
      { property: "og:title", content: "My Profile — ZILENCE" },
      { property: "og:description", content: "Informações pessoais do integrante da equipe ZILENCE." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { t } = useI18n();
  const { data: member } = useSuspenseQuery(memberQueryOptions);
  const player = member?.player;
  return (
    <div className="fade-up space-y-4">
      <PageHeader title={t("profile.title")} subtitle={t("profile.subtitle")} />
      {player && (
        <Section title={t("players.profile")}>
          <div className="flex flex-wrap items-center gap-4">
            <PlayerAvatar nickname={player.nickname} url={player.avatar_url} className="size-16" />
            <div>
              <p className="font-display text-2xl font-bold uppercase">{player.nickname}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <PositionBadge position={player.main_position} />
                {player.secondary_position && <PositionBadge position={player.secondary_position} secondary />}
                <Badge variant="muted">{player.elo ?? "—"}</Badge>
                <Badge variant="muted">{t(`status.${player.status}`)}</Badge>
              </div>
            </div>
          </div>
          {player.description && <p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">{player.description}</p>}
        </Section>
      )}
      <AccountSettings />
    </div>
  );
}
