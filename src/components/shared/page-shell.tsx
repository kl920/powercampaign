import { cn } from "@/lib/utils";

type MaxWidth = "sm" | "md" | "lg" | "xl";

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: MaxWidth;
}

const maxWidthMap: Record<MaxWidth, string> = {
  sm: "max-w-2xl",
  md: "max-w-3xl",
  lg: "max-w-5xl",
  xl: "max-w-7xl",
};

export function PageShell({
  children,
  className,
  maxWidth = "lg",
}: PageShellProps) {
  return (
    <div
      className={cn(
        "mx-auto px-4 py-6 sm:px-6",
        maxWidthMap[maxWidth],
        className,
      )}
    >
      {children}
    </div>
  );
}
