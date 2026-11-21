import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LANGUAGES, useI18n, type Language } from "@/i18n";
import { cn } from "@/lib/utils";

/** Changes the interface language and, when signed in, saves it on the account. */
export function useChangeLanguage(userId?: string | null) {
  const { setLang, t } = useI18n();
  const queryClient = useQueryClient();
  return async (next: Language) => {
    setLang(next);
    if (!userId) return;
    const { error } = await supabase.from("profiles").update({ language: next }).eq("id", userId);
    if (error) {
      toast.error(t("common.error"));
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["member"] });
  };
}

export function LanguageSwitch({ userId, className }: { userId?: string | null; className?: string }) {
  const { lang, t } = useI18n();
  const change = useChangeLanguage(userId);
  return (
    <div role="radiogroup" aria-label={t("common.language")} className={cn("inline-flex rounded-md border border-border bg-surface p-0.5", className)}>
      {LANGUAGES.map((code) => (
        <button
          key={code}
          type="button"
          role="radio"
          aria-checked={lang === code}
          onClick={() => change(code)}
          className={cn(
            "rounded px-2.5 py-1 font-display text-xs font-semibold tracking-wider transition-colors",
            lang === code ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
