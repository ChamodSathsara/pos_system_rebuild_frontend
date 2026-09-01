import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  tone = "primary",
  hint,
  isMoney,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: { value: number; label?: string };
  tone?: "primary" | "success" | "warning" | "destructive" | "info";
  hint?: string;
  isMoney?: boolean;
}) {
  const toneClasses: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
    info: "bg-info/10 text-info",
  };
  const positive = (trend?.value ?? 0) >= 0;

  return (
    <Card className="relative overflow-hidden p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={cn("mt-2 text-2xl font-bold text-foreground", isMoney && "num")}>{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          {trend && (
            <div className={cn("mt-2 inline-flex items-center gap-1 text-xs font-medium", positive ? "text-success" : "text-destructive")}>
              {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              <span className="num">{Math.abs(trend.value)}%</span>
              {trend.label && <span className="text-muted-foreground font-normal">{trend.label}</span>}
            </div>
          )}
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", toneClasses[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="receipt-notch absolute inset-x-0 bottom-0 h-1 opacity-40" />
    </Card>
  );
}
