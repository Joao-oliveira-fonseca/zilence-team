import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, PageHeader } from "@/components/common/Page";
import { HistoryTab, PerformanceTab } from "@/components/performance/PerformanceViews";
import { ChampionPoolTab } from "@/components/performance/ChampionPool";
import { memberQueryOptions } from "@/lib/member";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/_player/performance")({
  head: () => ({ meta: [{ title: "My Performance — ZILENCE" }] }),
  component: PerformancePage,
});

function PerformancePage() {
  const { t } = useI18n();
  const { data: member } = useSuspenseQuery(memberQueryOptions);
  const player = member?.player;
  return (
    <div className="fade-up">
      <PageHeader title={t("perf.title")} subtitle={t("perf.subtitle")} />
      {!player ? (
        <EmptyState text={t("player.notLinked")} />
      ) : (
        <Tabs defaultValue="performance" className="max-w-3xl">
          <TabsList>
            <TabsTrigger value="performance">{t("players.tabPerformance")}</TabsTrigger>
            <TabsTrigger value="champions">{t("players.tabChampions")}</TabsTrigger>
            <TabsTrigger value="history">{t("players.tabHistory")}</TabsTrigger>
          </TabsList>
          <TabsContent value="performance" className="mt-4"><PerformanceTab player={player} editable={false} /></TabsContent>
          <TabsContent value="champions" className="mt-4"><ChampionPoolTab player={player} editable={false} /></TabsContent>
          <TabsContent value="history" className="mt-4"><HistoryTab player={player} editable={false} /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}
