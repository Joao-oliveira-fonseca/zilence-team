import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoLockup } from "@/components/common/Logo";
import { LanguageSwitch } from "@/components/common/LanguageSwitch";
import { useI18n } from "@/i18n";

// Used both for password recovery and for accepting a coach's invite.
export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Definir senha — ZILENCE" },
      { name: "description", content: "Defina a senha da sua conta ZILENCE." },
      { property: "og:title", content: "Definir senha — ZILENCE" },
      { property: "og:description", content: "Defina a senha da sua conta ZILENCE." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [ready, setReady] = useState<"checking" | "ok" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let settled = false;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        settled = true;
        setReady("ok");
      }
    });
    supabase.auth.getSession().then(({ data: s }) => {
      if (s.session) {
        settled = true;
        setReady("ok");
      }
    });
    const timer = window.setTimeout(() => {
      if (!settled) setReady("invalid");
    }, 4000);
    return () => {
      data.subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error(t("auth.passwordShort"));
    if (password !== confirm) return toast.error(t("auth.passwordMismatch"));
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("auth.passwordUpdated"));
    navigate({ to: "/home", replace: true });
  }

  return (
    <main className="auth-backdrop flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-5">
        <Link to="/">
          <LogoLockup />
        </Link>
        <LanguageSwitch />
      </header>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="panel fade-up w-full max-w-sm p-7">
          <h1 className="font-display text-3xl font-bold uppercase tracking-wide">{t("auth.setPasswordTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("auth.setPasswordSubtitle")}</p>
          {ready === "checking" && (
            <div className="mt-8 flex justify-center text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          )}
          {ready === "invalid" && (
            <div className="mt-6 space-y-4">
              <p className="text-sm text-muted-foreground">{t("auth.linkInvalid")}</p>
              <Button asChild variant="secondary" className="w-full">
                <Link to="/auth">{t("auth.toSignIn")}</Link>
              </Button>
            </div>
          )}
          {ready === "ok" && (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">{t("auth.newPassword")}</Label>
                <Input id="new-password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">{t("auth.confirmPassword")}</Label>
                <Input id="confirm-password" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="animate-spin" />}
                {t("common.save")}
              </Button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
