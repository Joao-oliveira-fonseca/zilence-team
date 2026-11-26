import logoAsset from "@/assets/zilence-logo.png.asset.json";
import { cn } from "@/lib/utils";

export function LogoMark({ className, src, alt = "ZILENCE" }: { className?: string; src?: string | null; alt?: string }) {
  return (
    <img
      src={src || logoAsset.url}
      alt={alt}
      className={cn("aspect-square rounded-md object-cover", className)}
      width={40}
      height={40}
    />
  );
}

export function LogoLockup({ className, compact = false, name = "ZILENCE", slogan = "BUILT TO COMPETE.", logoUrl }: { className?: string; compact?: boolean; name?: string; slogan?: string; logoUrl?: string | null }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LogoMark className="size-9 ring-1 ring-border" src={logoUrl ?? null} alt={name} />
      {!compact && (
        <div className="min-w-0 leading-none">
          <div className="truncate font-display text-xl font-bold tracking-[0.18em] text-foreground">{name}</div>
          <div className="mt-1 truncate font-display text-[10px] font-semibold tracking-[0.3em] text-primary">{slogan}</div>
        </div>
      )}
    </div>
  );
}
