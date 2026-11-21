import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { invitePlayer } from "@/lib/invites.functions";
import { pendingAccountsQueryOptions } from "@/lib/queries";
import type { Player } from "@/lib/member";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

export function InviteDialog({ player, onOpenChange }: { player: Player | null; onOpenChange: (open: boolean) => void }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const invite = useServerFn(invitePlayer);
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (player) setEmail("");
  }, [player]);

  const mutation = useMutation({
    mutationFn: () =>
      invite({ data: { playerId: player!.id, email, redirectTo: `${window.location.origin}/reset-password` } }),
    onSuccess: (result) => {
      toast.success(result.existing ? t("players.inviteLinkedExisting") : t("players.inviteSent", { email }));
      queryClient.invalidateQueries({ queryKey: ["players"] });
      queryClient.invalidateQueries({ queryKey: ["pending-accounts"] });
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message || t("common.error")),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  return (
    <Dialog open={Boolean(player)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl uppercase">{t("players.inviteTitle", { name: player?.nickname ?? "" })}</DialogTitle>
          <DialogDescription>{t("players.inviteBody")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">{t("auth.email")}</Label>
            <Input id="invite-email" type="email" required maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="animate-spin" />}
              {t("players.inviteSend")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function LinkAccountDialog({ player, onOpenChange }: { player: Player | null; onOpenChange: (open: boolean) => void }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data: pending = [], isLoading } = useQuery({ ...pendingAccountsQueryOptions, enabled: Boolean(player) });
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => setSelected(null), [player]);

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("link_player_account", { _player_id: player!.id, _user_id: selected! });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("players.linkDone"));
      queryClient.invalidateQueries({ queryKey: ["players"] });
      queryClient.invalidateQueries({ queryKey: ["pending-accounts"] });
      onOpenChange(false);
    },
    onError: () => toast.error(t("common.error")),
  });

  return (
    <Dialog open={Boolean(player)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl uppercase">{t("players.linkPending")}</DialogTitle>
          <DialogDescription>{t("players.linkSelect")}</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="animate-spin text-muted-foreground" /></div>
        ) : pending.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">{t("players.noPending")}</p>
        ) : (
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {pending.map((acc) => (
              <li key={acc.id}>
                <button
                  type="button"
                  onClick={() => setSelected(acc.id)}
                  className={cn(
                    "w-full rounded-md border px-3 py-2 text-left transition-colors",
                    selected === acc.id ? "border-primary bg-primary-soft" : "border-border hover:bg-accent",
                  )}
                >
                  <p className="text-sm font-medium">{acc.display_name ?? acc.email}</p>
                  <p className="text-xs text-muted-foreground">{acc.email}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button type="button" disabled={!selected || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Loader2 className="animate-spin" />}
            {t("common.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
