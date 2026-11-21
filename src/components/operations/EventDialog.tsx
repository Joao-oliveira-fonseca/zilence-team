import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { memberQueryOptions, type Player } from "@/lib/member";
import { DEFAULT_TIMEZONE, EVENT_TYPES, addMinutesIso, isoToZonedInputs, zonedDateTimeToIso, type CalendarEvent } from "@/lib/operations";
import type { Database } from "@/integrations/supabase/types";
import { useI18n } from "@/i18n";
import { ParticipantPicker, TimezoneSelect } from "./OperationFields";

type EventType = Database["public"]["Enums"]["event_type"];
const orNull = (value: string) => value.trim() ? value.trim() : null;

function initialForm(event: CalendarEvent | null | undefined) {
  const start = event ? isoToZonedInputs(event.starts_at, event.timezone) : { date: isoToZonedInputs(new Date().toISOString(), DEFAULT_TIMEZONE).date, time: "18:00" };
  const end = event?.ends_at
    ? isoToZonedInputs(event.ends_at, event.timezone).time
    : event
      ? isoToZonedInputs(addMinutesIso(event.starts_at, 60), event.timezone).time
      : "19:00";
  return {
    title: event?.title ?? "",
    eventType: (event?.event_type ?? "training") as EventType,
    description: event?.description ?? "",
    date: start.date,
    startTime: start.time,
    endTime: end,
    timezone: event?.timezone ?? DEFAULT_TIMEZONE,
    location: event?.location ?? "",
    externalLink: event?.external_link ?? "",
    participantIds: event?.participant_ids.length ? event.participant_ids : event?.related_player_id ? [event.related_player_id] : [] as string[],
    notes: "",
  };
}

export function EventDialog({ open, onOpenChange, event, players, notes }: { open: boolean; onOpenChange: (open: boolean) => void; event?: CalendarEvent | null; players: Player[]; notes?: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: member } = useSuspenseQuery(memberQueryOptions);
  const [form, setForm] = useState(() => initialForm(event));
  const set = <K extends keyof ReturnType<typeof initialForm>>(key: K, value: ReturnType<typeof initialForm>[K]) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (open) setForm({ ...initialForm(event), notes: notes ?? "" });
  }, [open, event, notes]);

  const mutation = useMutation({
    mutationFn: async () => {
      const startsAt = zonedDateTimeToIso(form.date, form.startTime, form.timezone);
      const endsAt = zonedDateTimeToIso(form.date, form.endTime, form.timezone);
      if (new Date(endsAt) <= new Date(startsAt)) throw new Error("INVALID_END");
      const values = {
        title: form.title.trim(),
        event_type: form.eventType,
        description: orNull(form.description),
        starts_at: startsAt,
        ends_at: endsAt,
        timezone: form.timezone,
        location: orNull(form.location),
        external_link: orNull(form.externalLink),
        participant_ids: form.participantIds,
        related_player_id: form.participantIds.length === 1 ? form.participantIds[0] ?? null : null,
      };
      let eventId = event?.id;
      if (event) {
        const { error } = await supabase.from("calendar_events").update(values).eq("id", event.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("calendar_events").insert({ ...values, created_by: member?.userId ?? null }).select("id").single();
        if (error) throw error;
        eventId = data.id;
      }
      if (eventId && form.notes.trim()) {
        const { error } = await supabase.from("calendar_event_private_notes").upsert({ event_id: eventId, notes: form.notes.trim(), created_by: member?.userId ?? null });
        if (error) throw error;
      } else if (eventId) {
        const { error } = await supabase.from("calendar_event_private_notes").delete().eq("event_id", eventId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(t(event ? "ops.eventUpdated" : "ops.eventCreated"));
      qc.invalidateQueries({ queryKey: ["calendar-events"] });
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["event-private-notes"] });
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(t(error.message === "INVALID_END" ? "ops.invalidEnd" : "common.error")),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle className="font-display text-2xl uppercase">{t(event ? "ops.editEvent" : "ops.addEvent")}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="event-title">{t("ops.eventName")}</Label>
            <Input id="event-title" required maxLength={120} value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("ops.type")}</Label>
            <Select value={form.eventType} onValueChange={(v) => set("eventType", v as EventType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{EVENT_TYPES.map((type) => <SelectItem key={type} value={type}>{t(`event.${type}`)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <TimezoneSelect value={form.timezone} onChange={(v) => set("timezone", v)} />
          <div className="space-y-1.5">
            <Label htmlFor="event-date">{t("ops.date")}</Label>
            <Input id="event-date" type="date" required value={form.date} onChange={(e) => set("date", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="event-start">{t("ops.startTime")}</Label><Input id="event-start" type="time" required value={form.startTime} onChange={(e) => set("startTime", e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="event-end">{t("ops.endTime")}</Label><Input id="event-end" type="time" required value={form.endTime} onChange={(e) => set("endTime", e.target.value)} /></div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="event-location">{t("ops.location")}</Label>
            <Input id="event-location" maxLength={160} value={form.location} onChange={(e) => set("location", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="event-link">{t("ops.externalLink")} <span className="text-muted-foreground">({t("common.optional")})</span></Label>
            <Input id="event-link" type="url" placeholder="https://" value={form.externalLink} onChange={(e) => set("externalLink", e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="event-description">{t("ops.description")}</Label><Textarea id="event-description" rows={3} maxLength={3000} value={form.description} onChange={(e) => set("description", e.target.value)} /></div>
          <div className="sm:col-span-2"><ParticipantPicker players={players} value={form.participantIds} onChange={(v) => set("participantIds", v)} /></div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="event-notes">{t("ops.privateNotes")}</Label>
            <Textarea id="event-notes" rows={3} maxLength={4000} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            <p className="text-xs text-muted-foreground">{t("ops.privateNotesHint")}</p>
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">{t("ops.visibilityHint")}</p>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="animate-spin" />}{mutation.isPending ? t("common.saving") : t("common.save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
