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
import { DEFAULT_TIMEZONE, SCRIM_TYPES, addMinutesIso, isoToZonedInputs, zonedDateTimeToIso, type ScrimSession, type ScrimType } from "@/lib/operations";
import { useI18n } from "@/i18n";
import { ParticipantPicker, TimezoneSelect } from "./OperationFields";

function initialForm(session: ScrimSession | null | undefined) {
  const start = session ? isoToZonedInputs(session.starts_at, session.timezone) : { date: isoToZonedInputs(new Date().toISOString(), DEFAULT_TIMEZONE).date, time: "18:00" };
  return {
    opponent: session?.opponent ?? "",
    date: start.date,
    time: start.time,
    timezone: session?.timezone ?? DEFAULT_TIMEZONE,
    duration: String(session?.duration_minutes ?? 120),
    plannedGames: String(session?.planned_games ?? 3),
    scrimType: (session?.scrim_type ?? "BO3") as ScrimType,
    participantIds: session?.participant_ids ?? [],
    notes: "",
  };
}

export function ScrimDialog({ open, onOpenChange, session, players, notes }: { open: boolean; onOpenChange: (open: boolean) => void; session?: ScrimSession | null; players: Player[]; notes?: string | undefined }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: member } = useSuspenseQuery(memberQueryOptions);
  const [form, setForm] = useState(() => initialForm(session));
  const set = <K extends keyof ReturnType<typeof initialForm>>(key: K, value: ReturnType<typeof initialForm>[K]) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (open) setForm({ ...initialForm(session), notes: notes ?? "" });
  }, [open, session, notes]);

  const mutation = useMutation({
    mutationFn: async () => {
      const startsAt = zonedDateTimeToIso(form.date, form.time, form.timezone);
      const values = {
        opponent: form.opponent.trim(),
        starts_at: startsAt,
        timezone: form.timezone,
        duration_minutes: Number(form.duration),
        planned_games: Number(form.plannedGames),
        scrim_type: form.scrimType,
        participant_ids: form.participantIds,
      };
      let sessionId = session?.id;
      if (session) {
        const { error } = await supabase.from("scrim_sessions").update(values).eq("id", session.id);
        if (error) throw error;
        const { error: calendarError } = await supabase.from("calendar_events").update({
          title: t("ops.scrimVs", { opponent: values.opponent }),
          starts_at: startsAt,
          ends_at: addMinutesIso(startsAt, values.duration_minutes),
          timezone: form.timezone,
          participant_ids: form.participantIds,
          related_player_id: form.participantIds.length === 1 ? form.participantIds[0] ?? null : null,
        }).eq("scrim_session_id", session.id);
        if (calendarError) throw calendarError;
      } else {
        const { data, error } = await supabase.from("scrim_sessions").insert({ ...values, created_by: member?.userId ?? null }).select("id").single();
        if (error) throw error;
        sessionId = data.id;
        const { error: calendarError } = await supabase.from("calendar_events").insert({
          title: t("ops.scrimVs", { opponent: values.opponent }),
          event_type: "scrim",
          starts_at: startsAt,
          ends_at: addMinutesIso(startsAt, values.duration_minutes),
          timezone: form.timezone,
          participant_ids: form.participantIds,
          related_player_id: form.participantIds.length === 1 ? form.participantIds[0] ?? null : null,
          scrim_session_id: sessionId,
          created_by: member?.userId ?? null,
        });
        if (calendarError) throw calendarError;
      }
      if (sessionId && form.notes.trim()) {
        const { error } = await supabase.from("scrim_private_notes").upsert({ session_id: sessionId, notes: form.notes.trim(), created_by: member?.userId ?? null });
        if (error) throw error;
      } else if (sessionId) {
        const { error } = await supabase.from("scrim_private_notes").delete().eq("session_id", sessionId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(t(session ? "ops.scrimUpdated" : "ops.scrimCreated"));
      for (const key of ["scrim-sessions", "scrim-private-notes", "calendar-events", "events", "visibility-items"]) qc.invalidateQueries({ queryKey: [key] });
      onOpenChange(false);
    },
    onError: () => toast.error(t("common.error")),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle className="font-display text-2xl uppercase">{t(session ? "ops.editScrim" : "ops.addScrim")}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="scrim-opponent">{t("ops.opponent")}</Label><Input id="scrim-opponent" required maxLength={100} value={form.opponent} onChange={(e) => set("opponent", e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="scrim-date">{t("ops.date")}</Label><Input id="scrim-date" type="date" required value={form.date} onChange={(e) => set("date", e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="scrim-time">{t("ops.startTime")}</Label><Input id="scrim-time" type="time" required value={form.time} onChange={(e) => set("time", e.target.value)} /></div>
          <TimezoneSelect value={form.timezone} onChange={(v) => set("timezone", v)} />
          <div className="space-y-1.5"><Label>{t("ops.scrimType")}</Label><Select value={form.scrimType} onValueChange={(v) => set("scrimType", v as ScrimType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SCRIM_TYPES.map((type) => <SelectItem key={type} value={type}>{t(`scrimType.${type}`)}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label htmlFor="scrim-duration">{t("ops.duration")} ({t("ops.minutes")})</Label><Input id="scrim-duration" type="number" min={1} max={1440} required value={form.duration} onChange={(e) => set("duration", e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="scrim-games">{t("ops.plannedGames")}</Label><Input id="scrim-games" type="number" min={1} max={50} required value={form.plannedGames} onChange={(e) => set("plannedGames", e.target.value)} /></div>
          <div className="sm:col-span-2"><ParticipantPicker players={players} value={form.participantIds} onChange={(v) => set("participantIds", v)} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="scrim-notes">{t("ops.privateNotes")}</Label><Textarea id="scrim-notes" rows={3} maxLength={4000} value={form.notes} onChange={(e) => set("notes", e.target.value)} /><p className="text-xs text-muted-foreground">{t("ops.privateNotesHint")}</p></div>
          <p className="text-xs text-muted-foreground sm:col-span-2">{t("ops.visibilityHint")}</p>
          <DialogFooter className="sm:col-span-2"><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="animate-spin" />}{mutation.isPending ? t("common.saving") : t("common.save")}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
