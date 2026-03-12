import { cn } from "@/lib/utils";

type StatAccent = "green" | "blue" | "amber" | "default";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  accent?: StatAccent;
  className?: string;
}

const accentStyles: Record<StatAccent, { stripe: string; iconBg: string; iconText: string }> = {
  green: {
    stripe: "accent-stripe-green",
    iconBg: "bg-energy-green/15",
    iconText: "text-energy-green",
  },
  blue: {
    stripe: "accent-stripe-blue",
    iconBg: "bg-energy-blue/15",
    iconText: "text-energy-blue",
  },
  amber: {
    stripe: "accent-stripe-amber",
    iconBg: "bg-energy-amber/15",
    iconText: "text-energy-amber",
  },
  default: {
    stripe: "",
    iconBg: "bg-muted",
    iconText: "text-muted-foreground",
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  accent = "default",
  className,
}: StatCardProps) {
  const a = accentStyles[accent];

  return (
    <div
      className={cn(
        "glass-card hover-lift overflow-hidden p-6 text-card-foreground",
        a.stripe,
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {icon && (
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg",
              a.iconBg,
              a.iconText,
            )}
          >
            {icon}
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {trend && (
          <span
            className={cn(
              "flex items-center gap-0.5 text-xs font-semibold",
              trend === "up" && "text-success",
              trend === "down" && "text-danger",
              trend === "neutral" && "text-muted-foreground",
            )}
          >
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
            {trendValue}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}
