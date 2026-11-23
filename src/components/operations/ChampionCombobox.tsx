import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { iconFor, type Champion } from "@/lib/champions";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

export type ChampionChoice = Pick<Champion, "id" | "name">;

export function ChampionCombobox({
  champions,
  value,
  onChange,
  version,
  disabled = false,
  allowClear = true,
}: {
  champions: Champion[];
  value: ChampionChoice | null;
  onChange: (champion: ChampionChoice | null) => void;
  version?: string | undefined;
  disabled?: boolean;
  allowClear?: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open} disabled={disabled} className="h-9 w-full justify-between px-2.5 font-normal">
          <span className="flex min-w-0 items-center gap-2">
            {value && <img src={iconFor(value.id, version)} alt="" className="size-5 rounded-sm" width={20} height={20} />}
            <span className={cn("truncate", !value && "text-muted-foreground")}>{value?.name ?? t("champ.select")}</span>
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder={t("champ.search")} />
          <CommandList>
            <CommandEmpty>{t("champ.noChampions")}</CommandEmpty>
            <CommandGroup>
              {allowClear && <CommandItem value="__none" onSelect={() => { onChange(null); setOpen(false); }}><span className="size-5" />{t("common.none")}</CommandItem>}
              {champions.map((champion) => (
                <CommandItem key={champion.id} value={`${champion.name} ${champion.id}`} onSelect={() => { onChange({ id: champion.id, name: champion.name }); setOpen(false); }}>
                  <img src={champion.icon} alt="" className="size-5 rounded-sm" width={20} height={20} />
                  <span className="flex-1 truncate">{champion.name}</span>
                  <Check className={cn("size-4", value?.id === champion.id ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
