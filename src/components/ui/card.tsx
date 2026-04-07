import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-surface border border-border rounded-2xl p-4 shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
