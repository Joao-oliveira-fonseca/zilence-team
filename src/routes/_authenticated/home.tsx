import { createFileRoute, redirect } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { memberQueryOptions } from "@/lib/member";
import { useI18n } from "@/i18n";

// Sends each person to their own area; accounts without a role wait here.
export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Acesso à equipe — ZILENCE" },
      { name: "description", content: "Direcionamento e liberação de acesso à plataforma interna ZILENCE." },
      { property: "og:title", content: "Acesso à equipe — ZILENCE" },
      { property: "og:description", content: "Área de acesso dos integrantes da ZILENCE." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async ({ context }) => {
    const member = await context.queryClient.fetchQuery(memberQueryOptions);
    if (member?.role === "coach") throw redirect({ to: "/overview", replace: true });
    if (member?.role === "player") throw redirect({ to: "/dashboard", replace: true });
  },
  component: PendingAccess,
});

function PendingAccess() {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center">
      <div className="grid size-14 place-items-center rounded-full bg-primary-soft text-primary">
        <Clock className="size-6" />
      </div>
      <h1 className="mt-6 font-display text-3xl font-bold uppercase">{t("pending.title")}</h1>
      <p className="mt-3 text-muted-foreground">{t("pending.body")}</p>
    </div>
  );
}
