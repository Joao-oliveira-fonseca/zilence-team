import { useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlayerAvatar } from "@/components/common/Page";
import { TIMEZONES } from "@/lib/operations";
import type { Player } from "@/lib/member";
import { useI18n } from "@/i18n";

export function ParticipantPicker({ players, value, onChange }: { players: Player[]; value: string[]; onChange: (ids: string[]) => void }) {
  const { t } = useI18n();
  const id = useId();
  return (
    <div className="space-y-2">
      <Label>{t("ops.participants")}</Label>
      <div className="grid max-h-44 gap-1 overflow-y-auto rounded-md border border-input p-2 sm:grid-cols-2">
        {players.map((player) => {
          const checked = value.includes(player.id);
          return (
            <label key={player.id} htmlFor={`${id}-${player.id}`} className="flex cursor-pointer items-center gap-2 rounded-md p-2 hover:bg-surface">
              <Checkbox
                id={`${id}-${player.id}`}
                checked={checked}
                onCheckedChange={(next) => onChange(next ? [...value, player.id] : value.filter((item) => item !== player.id))}
              />
              <PlayerAvatar nickname={player.nickname} url={player.avatar_url} className="size-7" />
              <span className="min-w-0 flex-1 truncate text-sm">{player.nickname}</span>
              <span className="eyebrow text-[10px]">{player.main_position}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function TimezoneSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useI18n();
  return (
    <div className="space-y-1.5">
      <Label>{t("ops.timezone")}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {TIMEZONES.map((zone) => <SelectItem key={zone} value={zone}>{zone.replaceAll("_", " ")}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
