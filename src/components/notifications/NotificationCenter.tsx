import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Bell, CalendarDays, CheckCheck, ClipboardCheck, FileText, Star, Swords, Video } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { notificationsQueryOptions } from "@/lib/queries";
import { useI18n, type TranslationKey } from "@/i18n";
import { cn } from "@/lib/utils";

const icons = {
  evaluation_shared: Star,
  champion_pool_shared: Star,
  task_assigned: ClipboardCheck,
  task_due_soon: ClipboardCheck,
  event_created: CalendarDays,
  event_updated: CalendarDays,
  vod_shared: Video,
  scrim_shared: Swords,
  draft_shared: FileText,
};

export function NotificationCenter() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: notifications = [] } = useQuery(notificationsQueryOptions);
  const unread = useMemo(() => notifications.filter((notification) => notification.read_at === null), [notifications]);

  const markRead = useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    onError: () => toast.error(t("common.error")),
  });

  function openNotification(id: string, entityType: string) {
    markRead.mutate([id]);
    navigate({ to: entityType === "evaluation" || entityType === "champion_pool" ? "/performance" : "/hub" });
  }

  const dateFormat = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t("nav.notifications")}>
          <Bell />
          {unread.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 font-mono text-[9px] font-bold leading-4 text-primary-foreground">
              {unread.length > 99 ? "99+" : unread.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-1rem))] p-0">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <div className="flex-1">
            <p className="eyebrow text-foreground">{t("nav.notifications")}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("notification.unread", { n: unread.length })}</p>
          </div>
          {unread.length > 0 && (
            <Button variant="ghost" size="sm" disabled={markRead.isPending} onClick={() => markRead.mutate(unread.map((notification) => notification.id))}>
              <CheckCheck />
              {t("notification.markAll")}
            </Button>
          )}
        </div>
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Bell className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">{t("nav.noNotifications")}</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[min(30rem,70vh)]">
            <ul className="divide-y divide-border">
              {notifications.map((notification) => {
                const Icon = icons[notification.kind as keyof typeof icons] ?? Bell;
                const data = notification.data as { name?: string };
                const isUnread = notification.read_at === null;
                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      className={cn("flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent", isUnread && "bg-primary-soft/60")}
                      onClick={() => openNotification(notification.id, notification.entity_type)}
                    >
                      <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-surface text-muted-foreground", isUnread && "text-primary")}>
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{t(`notification.${notification.kind}` as TranslationKey, { name: data.name ?? "—" })}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">{dateFormat.format(new Date(notification.created_at))}</span>
                      </span>
                      {isUnread ? <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" /> : <Badge variant="muted">{t("notification.read")}</Badge>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
