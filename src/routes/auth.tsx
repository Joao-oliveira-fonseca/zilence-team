import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { LovableMark } from "@lovable.dev/cloud-auth-js/react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoLockup } from "@/components/common/Logo";
import { LanguageSwitch } from "@/components/common/LanguageSwitch";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — ZILENCE" },
      { name: "description", content: "Acesse a plataforma de gerenciamento competitivo da ZILENCE." },
      { property: "og:title", content: "Entrar — ZILENCE" },
      { property: "og:description", content: "Acesso para coaches e jogadores da ZILENCE." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

const emailSchema = z.string().trim().email().max(255);

function GoogleLogo() {
  return (
    <svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
  );
}

function AuthPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [canBootstrap, setCanBootstrap] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/home", replace: true });
    });
    supabase.rpc("has_any_coach").then(({ data }) => setCanBootstrap(data === false));
  }, [navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsedEmail = emailSchema.safeParse(email);
    if (!parsedEmail.success) {
      toast.error(t("auth.invalid"));
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: parsedEmail.data, password });
        if (error) {
          toast.error(t("auth.invalid"));
          return;
        }
        navigate({ to: "/home", replace: true });
      } else if (mode === "signup") {
        if (password.length < 8) {
          toast.error(t("auth.passwordShort"));
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email: parsedEmail.data,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/home`,
            data: { display_name: name.trim().slice(0, 60) || undefined },
          },
        });
        if (error) {
          toast.error(error.message);
          return;
        }
        if (data.session) navigate({ to: "/home", replace: true });
        else toast.success(t("auth.checkEmail"));
      } else {
        await supabase.auth.resetPasswordForEmail(parsedEmail.data, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        toast.success(t("auth.resetSent"));
        setMode("signin");
      }
    } finally {
      setBusy(false);
    }
  }

  async function social(provider: "google" | "lovable") {
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + "/auth" });
    if (result.error) {
      toast.error(t("common.error"));
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/home", replace: true });
  }

  const title = mode === "signin" ? t("auth.signInTitle") : mode === "signup" ? t("auth.signUpTitle") : t("auth.forgotTitle");
  const subtitle = mode === "signup" ? t("auth.signUpSubtitle") : t("auth.signInSubtitle");

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
          <h1 className="font-display text-3xl font-bold uppercase tracking-wide">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">{t("auth.displayName")}</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            {mode !== "forgot" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t("auth.password")}</Label>
                  {mode === "signin" && (
                    <button type="button" className="text-xs text-muted-foreground hover:text-primary" onClick={() => setMode("forgot")}>
                      {t("auth.forgot")}
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              {mode === "signin" ? t("auth.signIn") : mode === "signup" ? t("auth.signUp") : t("auth.sendReset")}
            </Button>
          </form>

          {mode !== "forgot" && (
            <>
              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                {t("auth.or")}
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-2">
                <Button type="button" variant="outline" className="google-btn h-10 w-full" onClick={() => social("google")}>
                  <GoogleLogo />
                  {t("auth.google")}
                </Button>
                <Button type="button" variant="outline" className="h-10 w-full" onClick={() => social("lovable")}>
                  <LovableMark />
                  {t("auth.lovable")}
                </Button>
              </div>
            </>
          )}

          <div className="mt-6 space-y-2 text-center text-sm">
            {mode !== "signin" && (
              <button type="button" className="text-muted-foreground hover:text-primary" onClick={() => setMode("signin")}>
                {t("auth.toSignIn")}
              </button>
            )}
            {mode === "signin" && canBootstrap && (
              <button type="button" className="text-primary hover:underline" onClick={() => setMode("signup")}>
                {t("auth.toSignUp")}
              </button>
            )}
            {mode === "signin" && <p className="text-xs text-muted-foreground">{t("auth.invitedHint")}</p>}
          </div>
        </div>
      </div>
    </main>
  );
}
