import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Section } from "@/components/common/Page";
import { LogoMark } from "@/components/common/Logo";
import { supabase } from "@/integrations/supabase/client";
import { writeAuditEntry } from "@/lib/audit";
import { teamSettingsQueryOptions } from "@/lib/queries";
import { useI18n } from "@/i18n";

export function TeamIdentity() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data: settings } = useSuspenseQuery(teamSettingsQueryOptions);
  const [name, setName] = useState(settings.name);
  const [slogan, setSlogan] = useState(settings.slogan);
  const [game, setGame] = useState(settings.game);
  const [logoUrl, setLogoUrl] = useState(settings.logo_url ?? "");
  const [about, setAbout] = useState(settings.about ?? "");

  const mutation = useMutation({
    mutationFn: async () => {
      const trimmedLogo = logoUrl.trim();
      if (trimmedLogo && !/^https?:\/\//i.test(trimmedLogo)) throw new Error("invalid_logo_url");
      const { error } = await supabase
        .from("team_settings")
        .update({
          name: name.trim(),
          slogan: slogan.trim(),
          game: game.trim(),
          logo_url: trimmedLogo || null,
          about: about.trim() || null,
        })
        .eq("id", 1);
      if (error) throw error;
      const changed: string[] = [];
      if (settings.name !== name.trim()) changed.push(t("team.name"));
      if (settings.slogan !== slogan.trim()) changed.push(t("team.slogan"));
      if (settings.game !== game.trim()) changed.push(t("team.game"));
      if ((settings.logo_url ?? "") !== trimmedLogo) changed.push(t("team.logoUrl"));
      if ((settings.about ?? "") !== about.trim()) changed.push(t("team.about"));
      await writeAuditEntry({
        action: "team.settings_updated",
        entityType: "team_settings",
        entityLabel: name.trim(),
        details: changed.length > 0 ? { fields: changed.join(", ") } : {},
      });
    },
    onSuccess: () => {
      toast.success(t("team.saved"));
      queryClient.invalidateQueries({ queryKey: ["team-settings"] });
    },
    onError: (error) => toast.error(t(error.message === "invalid_logo_url" ? "team.invalidLogoUrl" : "common.error")),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (name.trim() && slogan.trim() && game.trim()) mutation.mutate();
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]">
      <Section title={t("team.identity")} description={t("team.identityHint")}>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="team-name">{t("team.name")}</Label>
              <Input id="team-name" required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="team-game">{t("team.game")}</Label>
              <Input id="team-game" required maxLength={80} value={game} onChange={(event) => setGame(event.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="team-slogan">{t("team.slogan")}</Label>
            <Input id="team-slogan" required maxLength={120} value={slogan} onChange={(event) => setSlogan(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="team-logo">{t("team.logoUrl")}</Label>
            <Input id="team-logo" type="url" placeholder="https://" value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} />
            <p className="text-xs text-muted-foreground">{t("team.logoHint")}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="team-about">{t("team.about")}</Label>
            <Textarea id="team-about" rows={6} maxLength={5000} value={about} onChange={(event) => setAbout(event.target.value)} placeholder={t("team.aboutPlaceholder")} />
          </div>
          <Button type="submit" disabled={mutation.isPending || !name.trim() || !slogan.trim() || !game.trim()}>
            {mutation.isPending && <Loader2 className="animate-spin" />}
            {t("common.save")}
          </Button>
        </form>
      </Section>
      <div className="space-y-4">
        <Section title={t("team.preview")}>
          <div className="flex items-center gap-4 rounded-md border border-border bg-surface p-4">
            {logoUrl ? (
              <img src={logoUrl} alt={name} className="size-16 rounded-md object-cover" />
            ) : (
              <LogoMark className="size-16" />
            )}
            <div className="min-w-0">
              <p className="truncate font-display text-3xl font-bold uppercase">{name || "ZILENCE"}</p>
              <p className="mt-1 truncate text-xs font-semibold tracking-[0.2em] text-primary">{slogan || "BUILT TO COMPETE."}</p>
              <p className="mt-1 text-xs text-muted-foreground">{game}</p>
            </div>
          </div>
        </Section>
        <Section title={t("team.visualIdentity")}>
          <p className="text-sm text-muted-foreground">{t("team.visualIdentityHint")}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-md border border-border bg-background p-3">
              <span className="eyebrow">#101010</span>
              <p className="mt-1 text-xs text-muted-foreground">{t("team.black")}</p>
            </div>
            <div className="rounded-md border border-border bg-primary p-3 text-primary-foreground">
              <span className="eyebrow text-primary-foreground">#FF781F</span>
              <p className="mt-1 text-xs">{t("team.orange")}</p>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
