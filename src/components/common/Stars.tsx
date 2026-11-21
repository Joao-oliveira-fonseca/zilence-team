import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stars({ value, onChange, size = "md", label }: { value: number | null; onChange?: (v: number) => void; size?: "sm" | "md"; label?: string }) {
  const cls = size === "sm" ? "size-3.5" : "size-5";
  return (
    <div className="inline-flex items-center gap-0.5" role={onChange ? "radiogroup" : "img"} aria-label={label ?? `${value ?? 0}/5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = value !== null && n <= Math.round(value);
        const icon = <Star className={cn(cls, filled ? "fill-primary text-primary" : "text-muted-foreground/40")} />;
        return onChange ? (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${label ?? ""} ${n}`}
            onClick={() => onChange(value === n ? 0 : n)}
            className="rounded p-0.5 transition-transform hover:scale-110"
          >
            {icon}
          </button>
        ) : (
          <span key={n}>{icon}</span>
        );
      })}
    </div>
  );
}
