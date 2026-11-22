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
import { DEFAULT_TIMEZONE, TASK_CATEGORIES, TASK_PRIORITIES, isoToZonedInputs, zonedDateTimeToIso, type TaskCategory, type TeamTask } from "@/lib/operations";
import { TASK_STATUSES, type TaskPriority, type TaskStatus } from "@/lib/constants";
import { useI18n } from "@/i18n";

const TEAM = "TEAM";
const orNull = (value: string) => value.trim() ? value.trim() : null;

export function TaskDialog({ open, onOpenChange, task, players }: { open: boolean; onOpenChange: (open: boolean) => void; task?: TeamTask | null; players: Player[] }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: member } = useSuspenseQuery(memberQueryOptions);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [playerId, setPlayerId] = useState(TEAM);
  const [category, setCategory] = useState<TaskCategory>("individual_training");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [status, setStatus] = useState<TaskStatus>("pending");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("18:00");

  useEffect(() => {
    if (open) {
      const due = task?.due_at ? isoToZonedInputs(task.due_at, DEFAULT_TIMEZONE) : null;
      setTitle(task?.title ?? "");
      setDescription(task?.description ?? "");
      setPlayerId(task?.player_id ?? TEAM);
      setCategory(task?.category ?? "individual_training");
      setPriority(task?.priority ?? "medium");
      setStatus(task?.status ?? "pending");
      setDueDate(due?.date ?? "");
      setDueTime(due?.time ?? "18:00");
    }
  }, [open, task]);

  const mutation = useMutation({
    mutationFn: async () => {
      const values = {
        title: title.trim(),
        description: orNull(description),
        player_id: playerId === TEAM ? null : playerId,
        category,
        priority,
        status,
        due_at: dueDate ? zonedDateTimeToIso(dueDate, dueTime, DEFAULT_TIMEZONE) : null,
      };
      if (task) {
        const { error } = await supabase.from("team_tasks").update(values).eq("id", task.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("team_tasks").insert({ ...values, created_by: member?.userId ?? null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(t(task ? "ops.taskUpdated" : "ops.taskCreated"));
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["visibility-items"] });
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
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle className="font-display text-2xl uppercase">{t(task ? "ops.editTask" : "ops.addTask")}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="task-title">{t("ops.title")}</Label><Input id="task-title" required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="task-description">{t("ops.description")}</Label><Textarea id="task-description" rows={3} maxLength={3000} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t("ops.responsible")}</Label><Select value={playerId} onValueChange={setPlayerId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={TEAM}>{t("ops.teamTask")}</SelectItem>{players.map((player) => <SelectItem key={player.id} value={player.id}>{player.nickname}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label>{t("ops.category")}</Label><Select value={category} onValueChange={(v) => setCategory(v as TaskCategory)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TASK_CATEGORIES.map((item) => <SelectItem key={item} value={item}>{t(`taskCat.${item}`)}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label>{t("ops.priority")}</Label><Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TASK_PRIORITIES.map((item) => <SelectItem key={item} value={item}>{t(`priority.${item}`)}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label>{t("ops.status")}</Label><Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TASK_STATUSES.map((item) => <SelectItem key={item} value={item}>{t(`task.${item}`)}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label htmlFor="task-date">{t("ops.dueDate")} <span className="text-muted-foreground">({t("common.optional")})</span></Label><Input id="task-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="task-time">{t("ops.dueTime")}</Label><Input id="task-time" type="time" disabled={!dueDate} value={dueTime} onChange={(e) => setDueTime(e.target.value)} /></div>
          <p className="text-xs text-muted-foreground sm:col-span-2">{t("ops.visibilityHint")}</p>
          <DialogFooter className="sm:col-span-2"><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="animate-spin" />}{mutation.isPending ? t("common.saving") : t("common.save")}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
