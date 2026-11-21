import logoAsset from "@/assets/zilence-logo.png.asset.json";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src={logoAsset.url}
      alt="ZILENCE"
      className={cn("aspect-square rounded-md object-cover", className)}
      width={40}
      height={40}
    />
  );
}

export function LogoLockup({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LogoMark className="size-9 ring-1 ring-border" />
      {!compact && (
        <div className="leading-none">
          <div className="font-display text-xl font-bold tracking-[0.18em] text-foreground">ZILENCE</div>
          <div className="mt-1 font-display text-[10px] font-semibold tracking-[0.3em] text-primary">BUILT TO COMPETE.</div>
        </div>
      )}
    </div>
  );
}
