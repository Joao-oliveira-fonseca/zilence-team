import type { ReactNode } from "react";
import { Hammer } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useI18n, type TranslationKey } from "@/i18n";
import { cn } from "@/lib/utils";
import type { Position } from "@/lib/constants";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, accent = false }: { label: string; value: ReactNode; hint?: string; accent?: boolean }) {
  return (
    <div className={cn("panel p-4", accent && "border-primary/40")}>
      <p className="eyebrow">{label}</p>
      <p className={cn("mt-2 font-display text-4xl font-bold tabular", accent && "text-primary")}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Section({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("panel flex flex-col", className)}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="eyebrow text-foreground">{title}</h2>
        {action}
      </div>
      <div className="flex-1 p-4">{children}</div>
    </section>
  );
}

export function EmptyState({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
      {action}
    </div>
  );
}

/** Marks an area whose tools arrive in a later development stage. */
export function StageNotice({ stage, description }: { stage: number; description: TranslationKey }) {
  const { t } = useI18n();
  return (
    <div className="panel flex flex-col items-center gap-3 border-dashed px-6 py-14 text-center">
      <div className="grid size-11 place-items-center rounded-full bg-primary-soft text-primary">
        <Hammer className="size-5" />
      </div>
      <Badge variant="soft">{t("common.comingStage", { stage })}</Badge>
      <p className="max-w-md text-sm text-muted-foreground">{t(description)}</p>
    </div>
  );
}

export function PlayerAvatar({ nickname, url, className }: { nickname: string; url?: string | null; className?: string }) {
  return (
    <Avatar className={cn("size-9 ring-1 ring-border", className)}>
      {url && <AvatarImage src={url} alt={nickname} className="object-cover" />}
      <AvatarFallback className="bg-surface-raised font-display text-xs font-bold">{nickname.slice(0, 2).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

export function PositionBadge({ position, secondary = false }: { position: Position; secondary?: boolean }) {
  return (
    <Badge variant={secondary ? "muted" : "soft"} className="tracking-widest">
      {position}
    </Badge>
  );
}
