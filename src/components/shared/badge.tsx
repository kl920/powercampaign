import { cn } from "@/lib/utils";
import { Crown, Flame, Leaf, Lock, Moon, Target, Zap } from "lucide-react";

export type BadgeVariant =
  | "saver-10"
  | "saver-20"
  | "saver-30"
  | "night-saver"
  | "co2-hero"
  | "top-10"
  | "streak-7";

type BadgeSize = "sm" | "md" | "lg";

interface BadgeProps {
  variant: BadgeVariant;
  earned: boolean;
  size?: BadgeSize;
  showLabel?: boolean;
}

const sizeMap: Record<BadgeSize, { wrapper: string; icon: number; text: string }> = {
  sm: { wrapper: "h-8 w-8", icon: 14, text: "text-[10px]" },
  md: { wrapper: "h-12 w-12", icon: 20, text: "text-xs" },
  lg: { wrapper: "h-16 w-16", icon: 28, text: "text-sm" },
};

const badgeConfig: Record<BadgeVariant, { icon: typeof Zap; label: string; colorClass: string; glowClass: string }> = {
  "saver-10": {
    icon: Zap,
    label: "Sparer 10 %",
    colorClass: "bg-badge-saver text-white",
    glowClass: "ring-badge-saver/40",
  },
  "saver-20": {
    icon: Zap,
    label: "Sparer 20 %",
    colorClass: "bg-badge-saver text-white",
    glowClass: "ring-badge-saver/40",
  },
  "saver-30": {
    icon: Zap,
    label: "Sparer 30 %",
    colorClass: "bg-badge-saver text-white",
    glowClass: "ring-badge-saver/40",
  },
  "night-saver": {
    icon: Moon,
    label: "Natspar",
    colorClass: "bg-badge-night text-white",
    glowClass: "ring-badge-night/40",
  },
  "co2-hero": {
    icon: Leaf,
    label: "CO₂-helt",
    colorClass: "bg-badge-co2 text-white",
    glowClass: "ring-badge-co2/40",
  },
  "top-10": {
    icon: Crown,
    label: "Top 10",
    colorClass: "bg-badge-top text-white",
    glowClass: "ring-badge-top/40",
  },
  "streak-7": {
    icon: Flame,
    label: "7-dages streak",
    colorClass: "bg-badge-streak text-white",
    glowClass: "ring-badge-streak/40",
  },
};

export function Badge({ variant, earned, size = "md", showLabel = false }: BadgeProps) {
  const s = sizeMap[size];
  const cfg = badgeConfig[variant];
  const Icon = cfg.icon;

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          "relative flex items-center justify-center rounded-full transition-transform",
          s.wrapper,
          earned
            ? cn(cfg.colorClass, "ring-2", cfg.glowClass)
            : "bg-badge-locked text-muted-foreground opacity-40",
        )}
      >
        <Icon size={s.icon} />
        {!earned && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <Lock size={s.icon * 0.6} />
          </div>
        )}
      </div>
      {showLabel && (
        <span
          className={cn(
            "font-medium leading-tight text-center",
            s.text,
            earned ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {cfg.label}
        </span>
      )}
    </div>
  );
}
