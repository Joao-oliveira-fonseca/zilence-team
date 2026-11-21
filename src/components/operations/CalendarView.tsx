import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addDays, addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, MapPin, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/common/Page";
import { supabase } from "@/integrations/supabase/client";
import { eventDateKey, formatZonedDate, localDateKey, type CalendarEvent } from "@/lib/operations";
import type { Player } from "@/lib/member";
import { useI18n } from "@/i18n";
import { EventDialog } from "./EventDialog";

type View = "month" | "week" | "agenda";
type Note = { event_id: string; notes: string };

export function CalendarView({ events, players, notes, canEdit }: { events: CalendarEvent[]; players: Player[]; notes: Note[]; canEdit: boolean }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(new Date());
  const [agendaRange, setAgendaRange] = useState("upcoming");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const selected = events.find((event) => event.id === selectedId) ?? null;

  const days = useMemo(() => {
    if (view === "month") return eachDayOfInterval({ start: startOfWeek(startOfMonth(cursor)), end: endOfWeek(endOfMonth(cursor)) });
    return Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(cursor), index));
  }, [cursor, view]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = eventDateKey(event.starts_at, event.timezone);
      map.set(key, [...(map.get(key) ?? []), event].sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
    }
    return map;
  }, [events]);

  const agenda = events
    .filter((event) => agendaRange === "all" || new Date(event.ends_at ?? event.starts_at).getTime() >= Date.now())
    .sort((a, b) => agendaRange === "all" ? b.starts_at.localeCompare(a.starts_at) : a.starts_at.localeCompare(b.starts_at));

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("calendar_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("ops.eventDeleted"));
      setDeleteOpen(false);
      setSelectedId(null);
      qc.invalidateQueries({ queryKey: ["calendar-events"] });
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["visibility-items"] });
    },
    onError: () => toast.error(t("common.error")),
  });

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function move(direction: number) {
    if (view === "month") setCursor((date) => addMonths(date, direction));
    else if (view === "week") setCursor((date) => addWeeks(date, direction));
  }

  const title = view === "week"
    ? `${new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" }).format(days[0] ?? cursor)} — ${new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(days[6] ?? cursor)}`
    : new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(cursor);
  const time = (event: CalendarEvent) => new Intl.DateTimeFormat(locale, { timeZone: event.timezone, hour: "2-digit", minute: "2-digit" }).format(new Date(event.starts_at));

  const eventButton = (event: CalendarEvent) => (
    <button key={event.id} type="button" onClick={() => setSelectedId(event.id)} className="block w-full truncate rounded border-l-2 border-primary bg-primary-soft px-1.5 py-1 text-left text-[11px] font-medium text-foreground hover:bg-primary/20">
      {time(event)} · {event.title}
    </button>
  );

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList>
            <TabsTrigger value="month">{t("ops.monthly")}</TabsTrigger>
            <TabsTrigger value="week">{t("ops.weekly")}</TabsTrigger>
            <TabsTrigger value="agenda">{t("ops.agenda")}</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap items-center gap-2">
          {view === "agenda" ? (
            <Select value={agendaRange} onValueChange={setAgendaRange}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="upcoming">{t("ops.upcoming")}</SelectItem><SelectItem value="all">{t("ops.allEvents")}</SelectItem></SelectContent>
            </Select>
          ) : (
            <>
              <Button variant="outline" size="icon" aria-label={t("common.cancel")} onClick={() => move(-1)}><ChevronLeft /></Button>
              <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>{t("ops.today")}</Button>
              <Button variant="outline" size="icon" aria-label={t("common.confirm")} onClick={() => move(1)}><ChevronRight /></Button>
            </>
          )}
          {canEdit && <Button size="sm" onClick={openCreate}><Plus />{t("ops.addEvent")}</Button>}
        </div>
      </div>

      {view !== "agenda" && <h2 className="mb-3 font-display text-xl font-semibold capitalize">{title}</h2>}

      {view === "month" && (
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-7 border-b border-border pb-2">
              {days.slice(0, 7).map((day) => <div key={day.toISOString()} className="eyebrow text-center">{new Intl.DateTimeFormat(locale, { weekday: "short" }).format(day)}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const dayEvents = byDay.get(localDateKey(day)) ?? [];
                return (
                  <div key={day.toISOString()} className={`min-h-28 border-b border-r border-border p-1.5 ${isSameMonth(day, cursor) ? "" : "opacity-40"}`}>
                    <div className={`mb-1.5 grid size-6 place-items-center rounded-full text-xs ${localDateKey(day) === localDateKey(new Date()) ? "bg-primary font-bold text-primary-foreground" : "text-muted-foreground"}`}>{day.getDate()}</div>
                    <div className="space-y-1">{dayEvents.slice(0, 3).map(eventButton)}{dayEvents.length > 3 && <p className="px-1 text-[10px] text-muted-foreground">+{dayEvents.length - 3}</p>}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {view === "week" && (
        <div className="overflow-x-auto">
          <div className="grid min-w-[840px] grid-cols-7 gap-2">
            {days.map((day) => {
              const dayEvents = byDay.get(localDateKey(day)) ?? [];
              return (
                <div key={day.toISOString()} className="min-h-64 rounded-md border border-border bg-surface p-2">
                  <p className="eyebrow text-center">{new Intl.DateTimeFormat(locale, { weekday: "short" }).format(day)}</p>
                  <p className="mb-3 text-center font-display text-2xl font-bold">{day.getDate()}</p>
                  <div className="space-y-1.5">{dayEvents.map(eventButton)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "agenda" && (
        agenda.length === 0 ? <EmptyState text={t("ops.noEvents")} /> : (
          <div className="divide-y divide-border">
            {agenda.map((event) => (
              <button key={event.id} type="button" onClick={() => setSelectedId(event.id)} className="flex w-full items-center gap-3 py-3 text-left hover:bg-surface/60">
                <div className="grid size-10 shrink-0 place-items-center rounded-md bg-primary-soft text-primary"><CalendarDays className="size-5" /></div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{event.title}</p><p className="text-xs text-muted-foreground">{formatZonedDate(event.starts_at, event.timezone, locale)}</p></div>
                <Badge variant="soft">{t(`event.${event.event_type}`)}</Badge>
              </button>
            ))}
          </div>
        )
      )}

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <Badge variant="soft" className="w-fit">{t(`event.${selected.event_type}`)}</Badge>
                <SheetTitle className="font-display text-3xl uppercase">{selected.title}</SheetTitle>
                <SheetDescription>{formatZonedDate(selected.starts_at, selected.timezone, locale)}{selected.ends_at ? ` — ${new Intl.DateTimeFormat(locale, { timeZone: selected.timezone, hour: "2-digit", minute: "2-digit" }).format(new Date(selected.ends_at))}` : ""} · {selected.timezone}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-5">
                {selected.description && <div><p className="eyebrow">{t("ops.description")}</p><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{selected.description}</p></div>}
                {selected.location && <div className="flex items-center gap-2 text-sm"><MapPin className="size-4 text-primary" />{selected.location}</div>}
                {selected.external_link && <Button asChild variant="outline" size="sm"><a href={selected.external_link} target="_blank" rel="noreferrer"><ExternalLink />{t("ops.externalLink")}</a></Button>}
                <div>
                  <p className="eyebrow flex items-center gap-1.5"><Users className="size-3.5" />{t("ops.participants")}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selected.participant_ids.length === 0 ? <span className="text-sm text-muted-foreground">{t("ops.teamTask")}</span> : selected.participant_ids.map((id) => <Badge key={id} variant="muted">{players.find((p) => p.id === id)?.nickname ?? "—"}</Badge>)}
                  </div>
                </div>
                {canEdit && notes.find((note) => note.event_id === selected.id)?.notes && <div><p className="eyebrow">{t("ops.privateNotes")}</p><p className="mt-2 whitespace-pre-wrap rounded-md border border-border bg-surface p-3 text-sm text-muted-foreground">{notes.find((note) => note.event_id === selected.id)?.notes}</p></div>}
                {canEdit && <div className="flex gap-2 border-t border-border pt-5"><Button variant="outline" onClick={() => { setEditing(selected); setDialogOpen(true); }}><Pencil />{t("common.edit")}</Button><Button variant="destructive" onClick={() => setDeleteOpen(true)}><Trash2 />{t("common.delete")}</Button></div>}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {canEdit && <EventDialog open={dialogOpen} onOpenChange={setDialogOpen} event={editing} players={players} notes={editing ? notes.find((note) => note.event_id === editing.id)?.notes : undefined} />}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t("ops.deleteEventTitle", { name: selected?.title ?? "" })}</AlertDialogTitle><AlertDialogDescription>{t("ops.deleteEventBody")}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction disabled={deleteMutation.isPending} onClick={(e) => { e.preventDefault(); if (selected) deleteMutation.mutate(selected.id); }}>{t("common.delete")}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
