import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/common/Logo";
import { LanguageSwitch } from "@/components/common/LanguageSwitch";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ZILENCE — Built to Compete" },
      { name: "description", content: "Plataforma interna da ZILENCE para gerenciar jogadores, avaliações, scrims e calendário competitivo de League of Legends." },
      { property: "og:title", content: "ZILENCE — Built to Compete" },
      { property: "og:description", content: "Gerenciamento competitivo da equipe ZILENCE de League of Legends." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { t } = useI18n();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
  }, []);

  return (
    <main className="auth-backdrop relative flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-5">
        <span className="font-display text-sm font-semibold tracking-[0.3em] text-muted-foreground">ZILENCE · LoL</span>
        <LanguageSwitch />
      </header>
      <section className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        <LogoMark className="fade-up size-28 rounded-xl ring-1 ring-border glow-primary md:size-36" />
        <h1 className="fade-up mt-10 font-display text-6xl font-bold tracking-[0.2em] md:text-8xl">ZILENCE</h1>
        <p className="fade-up mt-3 font-display text-lg font-semibold tracking-[0.4em] text-primary">BUILT TO COMPETE.</p>
        <p className="fade-up mt-6 max-w-md text-muted-foreground">{t("landing.tagline")}</p>
        <Button asChild variant="hero" size="lg" className="fade-up mt-10">
          <Link to={signedIn ? "/home" : "/auth"}>
            {signedIn ? t("landing.open") : t("landing.enter")}
            <ArrowRight />
          </Link>
        </Button>
      </section>
    </main>
  );
}
