import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { ELO_TIERS, PLAYER_STATUSES, POSITIONS, REGIONS, eloTier, type PlayerStatus, type Position } from "@/lib/constants";
import type { Player } from "@/lib/member";
import { useI18n } from "@/i18n";

const DIVISIONS = ["IV", "III", "II", "I"] as const;
const APEX = ["Master", "Grandmaster", "Challenger"];
const NONE = "__none";

const schema = z.object({
  nickname: z.string().trim().min(1).max(40),
  real_name: z.string().trim().max(100).nullable(),
  avatar_url: z.string().trim().url().max(500).nullable(),
  main_position: z.enum(["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"]),
  secondary_position: z.enum(["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"]).nullable(),
  elo: z.string().max(40).nullable(),
  region: z.string().max(20).nullable(),
  description: z.string().trim().max(2000).nullable(),
  status: z.enum(["active", "substitute", "trial", "inactive"]),
});

type FormState = {
  nickname: string;
  real_name: string;
  avatar_url: string;
  main_position: Position;
  secondary_position: Position | typeof NONE;
  tier: string;
  division: string;
  region: string;
  description: string;
  status: PlayerStatus;
};

function initialState(player?: Player | null): FormState {
  const tier = eloTier(player?.elo) ?? NONE;
  const division = player?.elo?.split(" ")[1] ?? "IV";
  return {
    nickname: player?.nickname ?? "",
    real_name: player?.real_name ?? "",
    avatar_url: player?.avatar_url ?? "",
    main_position: player?.main_position ?? "TOP",
    secondary_position: player?.secondary_position ?? NONE,
    tier,
    division: DIVISIONS.includes(division as (typeof DIVISIONS)[number]) ? division : "IV",
    region: player?.region ?? "BR",
    description: player?.description ?? "",
    status: player?.status ?? "active",
  };
}

const orNull = (v: string) => (v.trim() === "" ? null : v.trim());

export function PlayerFormDialog({ open, onOpenChange, player }: { open: boolean; onOpenChange: (open: boolean) => void; player?: Player | null }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(() => initialState(player));

  useEffect(() => {
    if (open) setForm(initialState(player));
  }, [open, player]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const mutation = useMutation({
    mutationFn: async () => {
      const elo = form.tier === NONE ? null : APEX.includes(form.tier) ? form.tier : `${form.tier} ${form.division}`;
      const values = schema.parse({
        nickname: form.nickname,
        real_name: orNull(form.real_name),
        avatar_url: orNull(form.avatar_url),
        main_position: form.main_position,
        secondary_position: form.secondary_position === NONE || form.secondary_position === form.main_position ? null : form.secondary_position,
        elo,
        region: orNull(form.region),
        description: orNull(form.description),
        status: form.status,
      });
      if (player) {
        const { error } = await supabase.from("players").update(values).eq("id", player.id);
        if (error) throw error;
      } else {
        const { data: userData } = await supabase.auth.getUser();
        const { error } = await supabase.from("players").insert({ ...values, created_by: userData.user?.id ?? null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(player ? t("players.updated") : t("players.created"));
      queryClient.invalidateQueries({ queryKey: ["players"] });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      const code = (error as { code?: string })?.code;
      if (code === "23505") toast.error(t("players.duplicate"));
      else if (error instanceof z.ZodError) toast.error(error.issues[0]?.message ?? t("common.error"));
      else toast.error(t("common.error"));
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl uppercase">{player ? t("players.editTitle") : t("players.createTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="nickname">{t("players.nickname")}</Label>
            <Input id="nickname" required maxLength={40} value={form.nickname} onChange={(e) => set("nickname", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="real_name">
              {t("players.realName")} <span className="text-muted-foreground">({t("common.optional")})</span>
            </Label>
            <Input id="real_name" maxLength={100} value={form.real_name} onChange={(e) => set("real_name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("players.mainPosition")}</Label>
            <Select value={form.main_position} onValueChange={(v) => set("main_position", v as Position)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("players.secondaryPosition")}</Label>
            <Select value={form.secondary_position} onValueChange={(v) => set("secondary_position", v as Position | typeof NONE)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{t("common.none")}</SelectItem>
                {POSITIONS.filter((p) => p !== form.main_position).map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("players.elo")}</Label>
            <div className="flex gap-2">
              <Select value={form.tier} onValueChange={(v) => set("tier", v)}>
                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {ELO_TIERS.map((tier) => <SelectItem key={tier} value={tier}>{tier}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.tier !== NONE && !APEX.includes(form.tier) && (
                <Select value={form.division} onValueChange={(v) => set("division", v)}>
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIVISIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("players.region")}</Label>
            <Select value={form.region} onValueChange={(v) => set("region", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("players.status")}</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v as PlayerStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLAYER_STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`status.${s}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="avatar_url">
              {t("players.avatar")} <span className="text-muted-foreground">({t("common.optional")})</span>
            </Label>
            <Input id="avatar_url" type="url" maxLength={500} placeholder="https://" value={form.avatar_url} onChange={(e) => set("avatar_url", e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description">{t("players.description")}</Label>
            <Textarea id="description" rows={3} maxLength={2000} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="animate-spin" />}
              {mutation.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
