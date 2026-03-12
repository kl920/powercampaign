import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  gradient?: boolean;
}

export function PageHeader({
  title,
  description,
  children,
  gradient = false,
}: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between pb-6">
      <div>
        <h1
          className={cn(
            "text-2xl font-bold tracking-tight",
            gradient && "energy-gradient-text",
          )}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
