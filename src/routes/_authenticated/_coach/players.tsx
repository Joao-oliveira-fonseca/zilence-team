import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link2, Mail, MoreHorizontal, Pencil, Plus, Search, Trash2, Unlink, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState, PageHeader, PlayerAvatar, PositionBadge } from "@/components/common/Page";
import { PlayerFormDialog } from "@/components/players/PlayerFormDialog";
import { PlayerSheet } from "@/components/players/PlayerSheet";
import { InviteDialog, LinkAccountDialog } from "@/components/players/AccountDialogs";
import { supabase } from "@/integrations/supabase/client";
import { playersQueryOptions } from "@/lib/queries";
import { ELO_TIERS, POSITIONS, eloTier } from "@/lib/constants";
import type { Player } from "@/lib/member";
import { useI18n } from "@/i18n";

type PlayersSearch = { new?: boolean; player?: string };

export const Route = createFileRoute("/_authenticated/_coach/players")({
  head: () => ({ meta: [{ title: "Players — ZILENCE" }, { name: "description", content: "Cadastro e gerenciamento dos jogadores da ZILENCE." }] }),
  validateSearch: (search: Record<string, unknown>): PlayersSearch => ({
    ...(search["new"] === true || search["new"] === "true" ? { new: true } : {}),
    ...(typeof search["player"] === "string" ? { player: search["player"] } : {}),
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(playersQueryOptions),
  component: PlayersPage,
});

const ALL = "all";

function PlayersPage() {
  const { t } = useI18n();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const { data: players } = useSuspenseQuery(playersQueryOptions);

  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<string>(ALL);
  const [tier, setTier] = useState<string>(ALL);
  const [editing, setEditing] = useState<Player | null>(null);
  const [inviting, setInviting] = useState<Player | null>(null);
  const [linking, setLinking] = useState<Player | null>(null);
  const [deleting, setDeleting] = useState<Player | null>(null);

  const formOpen = Boolean(search.new) || Boolean(editing);
  const viewing = players.find((p) => p.id === search.player) ?? null;

  const filtered = useMemo(
    () =>
      players.filter((p) => {
        if (query && !p.nickname.toLowerCase().includes(query.trim().toLowerCase())) return false;
        if (position !== ALL && p.main_position !== position && p.secondary_position !== position) return false;
        if (tier !== ALL && eloTier(p.elo) !== tier) return false;
        return true;
      }),
    [players, query, position, tier],
  );

  const deleteMutation = useMutation({
    mutationFn: async (player: Player) => {
      const { error } = await supabase.from("players").delete().eq("id", player.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("players.deleted"));
      setDeleting(null);
      queryClient.invalidateQueries({ queryKey: ["players"] });
    },
    onError: () => toast.error(t("common.error")),
  });

  const unlinkMutation = useMutation({
    mutationFn: async (player: Player) => {
      const { error } = await supabase.rpc("unlink_player_account", { _player_id: player.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("players.unlinked"));
      queryClient.invalidateQueries({ queryKey: ["players"] });
      queryClient.invalidateQueries({ queryKey: ["pending-accounts"] });
    },
    onError: () => toast.error(t("common.error")),
  });

  function closeForm(open: boolean) {
    if (open) return;
    setEditing(null);
    if (search.new) navigate({ search: (prev) => ({ ...(prev.player ? { player: prev.player } : {}) }), replace: true });
  }

  function openPlayer(id: string | null) {
    navigate({ search: id ? { player: id } : {}, replace: true });
  }

  return (
    <div className="fade-up">
      <PageHeader
        title={t("players.title")}
        subtitle={t("players.subtitle")}
        actions={
          <Button onClick={() => navigate({ search: { new: true }, replace: true })}>
            <Plus />
            {t("players.add")}
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("players.searchPlaceholder")} className="pl-9" aria-label={t("common.search")} />
        </div>
        <Select value={position} onValueChange={setPosition}>
          <SelectTrigger className="sm:w-40" aria-label={t("players.filterPosition")}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("players.filterPosition")}: {t("common.all")}</SelectItem>
            {POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={tier} onValueChange={setTier}>
          <SelectTrigger className="sm:w-44" aria-label={t("players.filterElo")}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("players.filterElo")}: {t("common.all")}</SelectItem>
            {ELO_TIERS.map((tierName) => <SelectItem key={tierName} value={tierName}>{tierName}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="panel overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState text={players.length === 0 ? t("overview.noPlayers") : t("players.empty")} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="eyebrow">{t("players.nickname")}</TableHead>
                <TableHead className="eyebrow">{t("players.filterPosition")}</TableHead>
                <TableHead className="eyebrow hidden md:table-cell">{t("players.elo")}</TableHead>
                <TableHead className="eyebrow hidden lg:table-cell">{t("players.region")}</TableHead>
                <TableHead className="eyebrow hidden sm:table-cell">{t("players.status")}</TableHead>
                <TableHead className="eyebrow hidden md:table-cell">{t("players.account")}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => openPlayer(p.id)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <PlayerAvatar nickname={p.nickname} url={p.avatar_url} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{p.nickname}</p>
                        {p.real_name && <p className="truncate text-xs text-muted-foreground">{p.real_name}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <PositionBadge position={p.main_position} />
                      {p.secondary_position && <PositionBadge position={p.secondary_position} secondary />}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{p.elo ?? "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">{p.region ?? "—"}</TableCell>
                  <TableCell className="hidden sm:table-cell"><Badge variant="muted">{t(`status.${p.status}`)}</Badge></TableCell>
                  <TableCell className="hidden md:table-cell">
                    {p.user_id ? <Badge variant="success">{t("players.linked")}</Badge> : <Badge variant="muted">{t("players.notLinked")}</Badge>}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`${p.nickname} actions`}><MoreHorizontal /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openPlayer(p.id)}><UserRound />{t("players.profile")}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditing(p)}><Pencil />{t("common.edit")}</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {p.user_id ? (
                          <DropdownMenuItem onClick={() => unlinkMutation.mutate(p)}><Unlink />{t("players.unlink")}</DropdownMenuItem>
                        ) : (
                          <>
                            <DropdownMenuItem onClick={() => setInviting(p)}><Mail />{t("players.invite")}</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setLinking(p)}><Link2 />{t("players.linkPending")}</DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleting(p)}>
                          <Trash2 />{t("common.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <PlayerFormDialog open={formOpen} onOpenChange={closeForm} player={editing} />
      <PlayerSheet player={viewing} onOpenChange={(open) => !open && openPlayer(null)} onEdit={(p) => setEditing(p)} />
      <InviteDialog player={inviting} onOpenChange={(open) => !open && setInviting(null)} />
      <LinkAccountDialog player={linking} onOpenChange={(open) => !open && setLinking(null)} />

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("players.deleteTitle", { name: deleting?.nickname ?? "" })}</AlertDialogTitle>
            <AlertDialogDescription>{t("players.deleteBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                if (deleting) deleteMutation.mutate(deleting);
              }}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
