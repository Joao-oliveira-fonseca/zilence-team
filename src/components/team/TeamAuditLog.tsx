import { useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { History, Settings2, Shield, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, Section } from "@/components/common/Page";
import { auditLogQueryOptions } from "@/lib/queries";
import { useI18n } from "@/i18n";
import type { TranslationKey } from "@/i18n/pt";

const FILTERS = ["all", "roles", "accounts", "team"] as const;
type Filter = (typeof FILTERS)[number];

const ACTION_CATEGORY: Record<string, Filter> = {
  "role.coach_added": "roles",
  "role.coach_removed": "roles",
  "account.player_linked": "accounts",
  "account.invited": "accounts",
  "team.settings_updated": "team",
};

const ACTION_KEY: Record<string, TranslationKey> = {
  "role.coach_added": "audit.action.role.coach_added",
  "role.coach_removed": "audit.action.role.coach_removed",
  "account.player_linked": "audit.action.account.player_linked",
  "account.invited": "audit.action.account.invited",
  "team.settings_updated": "audit.action.team.settings_updated",
};

function detailsText(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  return Object.values(value as Record<string, unknown>)
    .map((item) => (item === null || item === undefined ? "" : String(item)))
    .filter((item) => item.length > 0)
    .join(" · ");
}

export function TeamAuditLog() {
  const { t, locale } = useI18n();
  const { data: entries } = useSuspenseQuery(auditLogQueryOptions);
  const [filter, setFilter] = useState<Filter>("all");

  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
    [locale],
  );

  const visible = useMemo(
    () => entries.filter((entry) => filter === "all" || ACTION_CATEGORY[entry.action] === filter),
    [entries, filter],
  );

  return (
    <Section title={t("team.audit")} description={t("team.auditHint")}>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((option) => (
          <Button
            key={option}
            size="sm"
            variant={filter === option ? "soft" : "outline"}
            onClick={() => setFilter(option)}
          >
            {t(`team.auditFilter.${option}` as TranslationKey)}
          </Button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="mt-4">
          <EmptyState text={t("team.auditEmpty")} />
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {visible.map((entry) => {
            const category = ACTION_CATEGORY[entry.action] ?? "team";
            const details = detailsText(entry.details);
            return (
              <li key={entry.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:gap-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-surface text-primary">
                  {category === "roles" ? <Shield className="size-4" /> : category === "accounts" ? <UserRound className="size-4" /> : <Settings2 className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{t(ACTION_KEY[entry.action] ?? "team.audit")}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {entry.entity_label ?? "—"}
                    {details ? ` · ${details}` : ""}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <History className="size-3" />
                    {dateFormat.format(new Date(entry.created_at))}
                    <span className="text-foreground/70">· {entry.actor_name}</span>
                  </p>
                </div>
                <Badge variant="muted" className="w-fit shrink-0">{t(`team.auditFilter.${category}` as TranslationKey)}</Badge>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}
