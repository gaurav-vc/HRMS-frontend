import { Card } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export function StatCard({ label, value, delta, icon: Icon, tone = "default" }: {
  label: string; value: string; delta?: string; icon: LucideIcon; tone?: "default" | "success" | "warning" | "info";
}) {
  const toneCls = tone === "success" ? "bg-success/10 text-success" : tone === "warning" ? "bg-warning/15 text-warning-foreground" : tone === "info" ? "bg-info/10 text-info" : "bg-primary/10 text-primary";
  const up = delta?.startsWith("+");
  return (
    <Card className="p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold mt-1 truncate">{value}</p>
          {delta && (
            <p className={`text-xs mt-1 flex items-center gap-1 ${up ? "text-success" : "text-destructive"}`}>
              {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {delta} vs last period
            </p>
          )}
        </div>
        <div className={`h-10 w-10 rounded-lg grid place-items-center shrink-0 ${toneCls}`}><Icon className="h-5 w-5" /></div>
      </div>
    </Card>
  );
}
