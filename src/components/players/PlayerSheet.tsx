import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlayerAvatar, PositionBadge, StageNotice } from "@/components/common/Page";
import type { Player } from "@/lib/member";
import { useI18n } from "@/i18n";

export function PlayerSheet({ player, onOpenChange, onEdit }: { player: Player | null; onOpenChange: (open: boolean) => void; onEdit: (p: Player) => void }) {
  const { t, locale } = useI18n();
  return (
    <Sheet open={Boolean(player)} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {player && (
          <>
            <SheetHeader className="text-left">
              <p className="eyebrow text-primary">{t("players.profile")}</p>
              <div className="mt-2 flex items-center gap-4">
                <PlayerAvatar nickname={player.nickname} url={player.avatar_url} className="size-16" />
                <div className="min-w-0">
                  <SheetTitle className="font-display text-3xl font-bold uppercase">{player.nickname}</SheetTitle>
                  <SheetDescription>{player.real_name ?? " "}</SheetDescription>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <PositionBadge position={player.main_position} />
                    {player.secondary_position && <PositionBadge position={player.secondary_position} secondary />}
                    <Badge variant="muted">{t(`status.${player.status}`)}</Badge>
                  </div>
                </div>
              </div>
            </SheetHeader>

            <Tabs defaultValue="overview" className="mt-6">
              <TabsList className="w-full">
                <TabsTrigger value="overview" className="flex-1">{t("players.tabOverview")}</TabsTrigger>
                <TabsTrigger value="performance" className="flex-1">{t("players.tabPerformance")}</TabsTrigger>
                <TabsTrigger value="champions" className="flex-1">{t("players.tabChampions")}</TabsTrigger>
                <TabsTrigger value="history" className="flex-1">{t("players.tabHistory")}</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="mt-4 space-y-4">
                <dl className="grid grid-cols-2 gap-3">
                  {[
                    [t("players.elo"), player.elo ?? "—"],
                    [t("players.region"), player.region ?? "—"],
                    [t("players.account"), player.user_id ? t("players.linked") : t("players.notLinked")],
                    ["", t("players.since", { date: new Date(player.created_at).toLocaleDateString(locale) })],
                  ].map(([label, value], i) => (
                    <div key={i} className="rounded-md border border-border bg-surface p-3">
                      {label && <dt className="eyebrow">{label}</dt>}
                      <dd className="mt-1 text-sm font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
                {player.description && (
                  <div>
                    <p className="eyebrow">{t("players.description")}</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{player.description}</p>
                  </div>
                )}
                <Button variant="secondary" onClick={() => onEdit(player)}>{t("common.edit")}</Button>
              </TabsContent>
              <TabsContent value="performance" className="mt-4">
                <StageNotice stage={2} description="stage.performance" />
              </TabsContent>
              <TabsContent value="champions" className="mt-4">
                <StageNotice stage={2} description="stage.champions" />
              </TabsContent>
              <TabsContent value="history" className="mt-4">
                <StageNotice stage={2} description="stage.history" />
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
