import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Loader2, Mail, Shield, ShieldMinus, ShieldPlus, UserRound, UserRoundPlus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, PlayerAvatar, PositionBadge, Section, StatCard } from "@/components/common/Page";
import { supabase } from "@/integrations/supabase/client";
import { pendingAccountsQueryOptions, playersQueryOptions, profilesQueryOptions, userRolesQueryOptions } from "@/lib/queries";
import { writeAuditEntry } from "@/lib/audit";
import { useI18n } from "@/i18n";

type PendingAccount = { id: string; email: string | null; display_name: string | null };

export function TeamMembers() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data: players } = useSuspenseQuery(playersQueryOptions);
  const { data: profiles } = useSuspenseQuery(profilesQueryOptions);
  const { data: roles } = useSuspenseQuery(userRolesQueryOptions);
  const { data: pending } = useSuspenseQuery(pendingAccountsQueryOptions);
  const [removing, setRemoving] = useState<PendingAccount | null>(null);
  const [assigningPlayer, setAssigningPlayer] = useState<PendingAccount | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const unlinkedPlayers = players.filter((player) => player.user_id === null);

  const coaches = useMemo(
    () => roles.filter((role) => role.role === "coach").map((role) => profiles.find((profile) => profile.id === role.user_id)).filter((profile) => profile !== undefined),
    [roles, profiles],
  );
  const linkedPlayers = players.filter((player) => player.user_id !== null);

  function invalidateMembers() {
    for (const key of ["profiles", "user-roles", "players", "pending-accounts", "member"]) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  }

  const promote = useMutation({
    mutationFn: async (account: PendingAccount) => {
      const { error } = await supabase.rpc("assign_coach_role", { _user_id: account.id });
      if (error) throw error;
      await writeAuditEntry({
        action: "role.coach_added",
        entityType: "user",
        entityId: account.id,
        entityLabel: account.display_name ?? account.email,
        details: { account: account.email ?? "—" },
      });
    },
    onSuccess: () => {
      toast.success(t("team.coachAdded"));
      invalidateMembers();
    },
    onError: () => toast.error(t("common.error")),
  });

  const makePlayer = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("link_player_account", { _player_id: selectedPlayer, _user_id: assigningPlayer!.id });
      if (error) throw error;
      const linked = players.find((player) => player.id === selectedPlayer);
      await writeAuditEntry({
        action: "account.player_linked",
        entityType: "player",
        entityId: selectedPlayer,
        entityLabel: linked?.nickname ?? null,
        details: { account: assigningPlayer!.email ?? assigningPlayer!.display_name ?? "—" },
      });
    },
    onSuccess: () => {
      toast.success(t("team.playerAdded"));
      setAssigningPlayer(null);
      setSelectedPlayer("");
      invalidateMembers();
    },
    onError: () => toast.error(t("common.error")),
  });

  const remove = useMutation({
    mutationFn: async (account: PendingAccount) => {
      const { error } = await supabase.rpc("remove_coach_role", { _user_id: account.id });
      if (error) throw error;
      await writeAuditEntry({
        action: "role.coach_removed",
        entityType: "user",
        entityId: account.id,
        entityLabel: account.display_name ?? account.email,
        details: { account: account.email ?? "—" },
      });
    },
    onSuccess: () => {
      toast.success(t("team.coachRemoved"));
      setRemoving(null);
      invalidateMembers();
    },
    onError: (error) => toast.error(t(error.message.includes("last_coach") ? "team.lastCoach" : "common.error")),
  });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t("team.coaches")} value={coaches.length} accent />
        <StatCard label={t("team.roster")} value={players.length} />
        <StatCard label={t("team.linkedPlayers")} value={linkedPlayers.length} />
        <StatCard label={t("overview.kpiPendingAccounts")} value={pending.length} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Section title={t("team.coaches")} description={t("team.coachesHint")}>
          {coaches.length === 0 ? <EmptyState text={t("team.noCoaches")} /> : (
            <ul className="divide-y divide-border">
              {coaches.map((coach) => (
                <li key={coach.id} className="flex items-center gap-3 py-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary-soft text-primary"><Shield className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{coach.display_name ?? t("role.coach")}</p>
                    <p className="truncate text-xs text-muted-foreground">{coach.email ?? "—"}</p>
                  </div>
                  <Badge variant="soft">{t("role.coach")}</Badge>
                  <Button variant="ghost" size="icon" disabled={coaches.length <= 1} aria-label={t("team.removeCoach")} onClick={() => setRemoving(coach)}>
                    <ShieldMinus />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {coaches.length <= 1 && <p className="mt-3 text-xs text-muted-foreground">{t("team.lastCoachHint")}</p>}
        </Section>

        <Section title={t("team.pendingAccounts")} description={t("team.pendingHint")}>
          {pending.length === 0 ? <EmptyState text={t("players.noPending")} /> : (
            <ul className="divide-y divide-border">
              {pending.map((account) => (
                <li key={account.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
                  <span className="grid size-9 shrink-0 place-items-center rounded-md bg-surface text-muted-foreground"><Mail className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{account.display_name ?? account.email}</p>
                    <p className="truncate text-xs text-muted-foreground">{account.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="soft" disabled={makePlayer.isPending} onClick={() => { setAssigningPlayer(account); setSelectedPlayer(""); }}>
                      <UserRoundPlus />{t("team.makePlayer")}
                    </Button>
                    <Button size="sm" variant="outline" disabled={promote.isPending} onClick={() => promote.mutate(account)}>
                      <ShieldPlus />{t("team.makeCoach")}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Button asChild variant="link" className="mt-2 px-0"><Link to="/players">{t("team.managePlayerAccounts")}</Link></Button>
        </Section>
      </div>

      <Section title={t("team.roster")} description={t("team.rosterHint")} action={<Button asChild size="sm" variant="soft"><Link to="/players">{t("common.viewAll")}</Link></Button>}>
        {players.length === 0 ? <EmptyState text={t("overview.noPlayers")} /> : (
          <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {players.map((player) => {
              const account = profiles.find((profile) => profile.id === player.user_id);
              return (
                <li key={player.id} className="flex items-center gap-3 rounded-md border border-border bg-surface p-3">
                  <PlayerAvatar nickname={player.nickname} url={player.avatar_url} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{player.nickname}</p>
                    <p className="truncate text-xs text-muted-foreground">{account?.email ?? t("players.notLinked")}</p>
                    <div className="mt-2 flex flex-wrap gap-1"><PositionBadge position={player.main_position} /><Badge variant="muted">{t(`status.${player.status}`)}</Badge></div>
                  </div>
                  <Button asChild variant="ghost" size="icon" aria-label={t("players.profile")}><Link to="/players" search={{ player: player.id }}><UserRound /></Link></Button>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title={t("team.permissions")}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-md border border-border bg-surface p-4">
            <p className="flex items-center gap-2 font-display text-lg font-semibold"><Shield className="size-4 text-primary" />{t("role.coach")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t("team.coachPermissions")}</p>
          </div>
          <div className="rounded-md border border-border bg-surface p-4">
            <p className="flex items-center gap-2 font-display text-lg font-semibold"><UserRound className="size-4 text-primary" />{t("role.player")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t("team.playerPermissions")}</p>
          </div>
        </div>
      </Section>

      <Dialog open={Boolean(assigningPlayer)} onOpenChange={(open) => { if (!open) { setAssigningPlayer(null); setSelectedPlayer(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("team.makePlayerTitle", { name: assigningPlayer?.display_name ?? assigningPlayer?.email ?? "" })}</DialogTitle>
            <DialogDescription>{t("team.makePlayerBody")}</DialogDescription>
          </DialogHeader>
          {unlinkedPlayers.length === 0 ? (
            <p className="rounded-md border border-border bg-surface p-3 text-sm text-muted-foreground">{t("team.noUnlinkedPlayers")}</p>
          ) : (
            <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
              <SelectTrigger aria-label={t("team.selectPlayer")}><SelectValue placeholder={t("team.selectPlayer")} /></SelectTrigger>
              <SelectContent>
                {unlinkedPlayers.map((player) => <SelectItem key={player.id} value={player.id}>{player.nickname} · {player.main_position}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAssigningPlayer(null)}>{t("common.cancel")}</Button>
            <Button disabled={!selectedPlayer || makePlayer.isPending} onClick={() => makePlayer.mutate()}>
              {makePlayer.isPending && <Loader2 className="animate-spin" />}{t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(removing)} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("team.removeCoachTitle", { name: removing?.display_name ?? removing?.email ?? "" })}</AlertDialogTitle>
            <AlertDialogDescription>{t("team.removeCoachBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => { event.preventDefault(); if (removing) remove.mutate(removing); }}>{t("common.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
