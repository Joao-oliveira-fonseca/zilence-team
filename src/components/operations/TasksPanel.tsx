import { useMemo, useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, Clock3, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EmptyState, StatCard } from "@/components/common/Page";
import { supabase } from "@/integrations/supabase/client";
import { playersQueryOptions, tasksQueryOptions } from "@/lib/queries";
import { DEFAULT_TIMEZONE, TASK_CATEGORIES, formatZonedDate, type TaskCategory, type TeamTask } from "@/lib/operations";
import { TASK_STATUSES, effectiveTaskStatus, type TaskStatus } from "@/lib/constants";
import { useI18n } from "@/i18n";
import { TaskDialog } from "./TaskDialog";

const ALL = "ALL";
const statusIcon = { pending: Circle, in_progress: Clock3, completed: CheckCircle2, overdue: Clock3 };

export function TasksPanel({ canEdit }: { canEdit: boolean }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const { data: tasks } = useSuspenseQuery(tasksQueryOptions);
  const { data: players } = useSuspenseQuery(playersQueryOptions);
  const [status, setStatus] = useState(ALL);
  const [playerId, setPlayerId] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [editing, setEditing] = useState<TeamTask | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<TeamTask | null>(null);
  const selected = tasks.find((task) => task.id === selectedId) ?? null;
  const shown = useMemo(() => tasks.filter((task) => (status === ALL || effectiveTaskStatus(task) === status) && (playerId === ALL || (playerId === "TEAM" ? task.player_id === null : task.player_id === playerId)) && (category === ALL || task.category === category)), [tasks, status, playerId, category]);
  const nick = (id: string | null) => id ? players.find((player) => player.id === id)?.nickname ?? "—" : t("ops.teamTask");

  const statusMutation = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: TaskStatus }) => {
      const { error } = await supabase.from("team_tasks").update({ status: next }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(t("ops.taskUpdated")); qc.invalidateQueries({ queryKey: ["tasks"] }); },
    onError: () => toast.error(t("common.error")),
  });

  const deletion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("team_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("ops.taskDeleted"));
      setDeleting(null);
      setSelectedId(null);
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["visibility-items"] });
    },
    onError: () => toast.error(t("common.error")),
  });

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {TASK_STATUSES.map((item) => <StatCard key={item} label={t(`task.${item}`)} value={tasks.filter((task) => effectiveTaskStatus(task) === item).length} accent={item === "in_progress"} />)}
      </div>
      <div className="mb-4 flex flex-col gap-2 md:flex-row">
        <Select value={status} onValueChange={setStatus}><SelectTrigger className="md:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ALL}>{t("ops.status")}: {t("common.all")}</SelectItem>{TASK_STATUSES.map((item) => <SelectItem key={item} value={item}>{t(`task.${item}`)}</SelectItem>)}</SelectContent></Select>
        <Select value={playerId} onValueChange={setPlayerId}><SelectTrigger className="md:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ALL}>{t("ops.responsible")}: {t("common.all")}</SelectItem><SelectItem value="TEAM">{t("ops.teamTask")}</SelectItem>{players.map((player) => <SelectItem key={player.id} value={player.id}>{player.nickname}</SelectItem>)}</SelectContent></Select>
        <Select value={category} onValueChange={setCategory}><SelectTrigger className="md:w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ALL}>{t("ops.category")}: {t("common.all")}</SelectItem>{TASK_CATEGORIES.map((item) => <SelectItem key={item} value={item}>{t(`taskCat.${item}`)}</SelectItem>)}</SelectContent></Select>
        {canEdit && <Button className="md:ml-auto" onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus />{t("ops.addTask")}</Button>}
      </div>

      {shown.length === 0 ? <EmptyState text={t("ops.noTasks")} action={canEdit ? <Button variant="soft" onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus />{t("ops.addTask")}</Button> : undefined} /> : (
        <div className="divide-y divide-border rounded-md border border-border">
          {shown.map((task) => {
            const effective = effectiveTaskStatus(task);
            const Icon = statusIcon[effective];
            return (
              <div key={task.id} className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
                <button type="button" onClick={() => setSelectedId(task.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <Icon className={`size-5 shrink-0 ${effective === "completed" ? "text-success" : effective === "overdue" ? "text-destructive" : "text-primary"}`} />
                  <div className="min-w-0"><p className="truncate text-sm font-medium">{task.title}</p><p className="truncate text-xs text-muted-foreground">{nick(task.player_id)} · {t(`taskCat.${task.category}`)}</p></div>
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={task.priority === "urgent" || task.priority === "high" ? "soft" : "muted"}>{t(`priority.${task.priority}`)}</Badge>
                  <span className="min-w-28 text-xs text-muted-foreground">{task.due_at ? formatZonedDate(task.due_at, DEFAULT_TIMEZONE, locale) : "—"}</span>
                  {canEdit ? <Select value={task.status} onValueChange={(next) => statusMutation.mutate({ id: task.id, next: next as TaskStatus })}><SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger><SelectContent>{TASK_STATUSES.map((item) => <SelectItem key={item} value={item}>{t(`task.${item}`)}</SelectItem>)}</SelectContent></Select> : <Badge variant={effective === "overdue" ? "destructive" : effective === "completed" ? "success" : "muted"}>{t(`task.${effective}`)}</Badge>}
                  {canEdit && <><Button variant="ghost" size="icon" aria-label={t("common.edit")} onClick={() => { setEditing(task); setDialogOpen(true); }}><Pencil /></Button><Button variant="ghost" size="icon" aria-label={t("common.delete")} onClick={() => setDeleting(task)}><Trash2 /></Button></>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          {selected && <><SheetHeader><Badge variant="soft" className="w-fit">{t(`taskCat.${selected.category}`)}</Badge><SheetTitle className="font-display text-3xl uppercase">{selected.title}</SheetTitle><SheetDescription>{nick(selected.player_id)}</SheetDescription></SheetHeader><div className="mt-6 space-y-5"><div className="flex flex-wrap gap-2"><Badge variant="muted">{t(`priority.${selected.priority}`)}</Badge><Badge variant={effectiveTaskStatus(selected) === "overdue" ? "destructive" : "muted"}>{t(`task.${effectiveTaskStatus(selected)}`)}</Badge></div>{selected.description && <div><p className="eyebrow">{t("ops.description")}</p><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{selected.description}</p></div>}<div><p className="eyebrow">{t("ops.dueDate")}</p><p className="mt-1 text-sm">{selected.due_at ? formatZonedDate(selected.due_at, DEFAULT_TIMEZONE, locale) : "—"}</p></div><div><p className="eyebrow">{t("ops.createdAt")}</p><p className="mt-1 text-sm">{new Date(selected.created_at).toLocaleDateString(locale)}</p></div>{canEdit && <Button variant="outline" onClick={() => { setEditing(selected); setDialogOpen(true); }}><Pencil />{t("common.edit")}</Button>}</div></>}
        </SheetContent>
      </Sheet>
      {canEdit && <TaskDialog open={dialogOpen} onOpenChange={setDialogOpen} task={editing} players={players} />}
      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("ops.deleteTaskTitle", { name: deleting?.title ?? "" })}</AlertDialogTitle><AlertDialogDescription>{t("ops.deleteTaskBody")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction onClick={(e) => { e.preventDefault(); if (deleting) deletion.mutate(deleting.id); }}>{t("common.delete")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
