import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Section } from "@/components/common/Page";
import { LanguageSwitch } from "@/components/common/LanguageSwitch";
import { supabase } from "@/integrations/supabase/client";
import { memberQueryOptions } from "@/lib/member";
import { useI18n } from "@/i18n";

/** Display name and language — shared by coach Settings and player My Profile. */
export function AccountSettings() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data: member } = useSuspenseQuery(memberQueryOptions);
  const [name, setName] = useState(member?.profile?.display_name ?? "");

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: name.trim().slice(0, 60) || null })
        .eq("id", member!.userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("common.saved"));
      queryClient.invalidateQueries({ queryKey: ["member"] });
    },
    onError: () => toast.error(t("common.error")),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title={t("settings.profile")}>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="display-name">{t("settings.displayName")}</Label>
            <Input id="display-name" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("auth.email")}</Label>
            <Input value={member?.email ?? ""} disabled />
          </div>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="animate-spin" />}
            {t("common.save")}
          </Button>
        </form>
      </Section>
      <Section title={t("common.language")}>
        <LanguageSwitch userId={member?.userId} />
        <p className="mt-3 text-sm text-muted-foreground">{t("settings.languageHint")}</p>
      </Section>
    </div>
  );
}
