import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

/**
 * Card de métrica do dashboard. Números de dinheiro são o momento emocional
 * do produto — tratados como heróis tipográficos (tabular figures, peso 700).
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  sub,
  className,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  tone?: "default" | "gold" | "dark";
  sub?: string;
  className?: string;
}) {
  if (tone === "dark") {
    return (
      <Card tone="dark" className={cn("relative overflow-hidden", className)}>
        <span aria-hidden className="absolute inset-x-5 top-0 h-px bg-accent-line-gold" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="t-eyebrow text-credios-gold-300">{label}</p>
            <p className="t-money text-3xl sm:text-4xl mt-2 text-white">{value}</p>
            {sub && <p className="t-caption text-white/60 mt-1">{sub}</p>}
          </div>
          {Icon && (
            <span className="flex size-11 items-center justify-center rounded-md bg-credios-gold/15">
              <Icon size={20} className="text-credios-gold" aria-hidden />
            </span>
          )}
        </div>
      </Card>
    );
  }
  return (
    <Card tone="outlined" className={className}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="t-eyebrow text-neutral-500">{label}</p>
          <p
            className={cn(
              "t-money text-3xl sm:text-4xl mt-2",
              tone === "gold" ? "text-credios-gold-700" : "text-credios-charcoal"
            )}
          >
            {value}
          </p>
          {sub && <p className="t-caption text-neutral-500 mt-1">{sub}</p>}
        </div>
        {Icon && (
          <span className="flex size-11 items-center justify-center rounded-md bg-credios-gold/15">
            <Icon size={20} className="text-credios-gold-700" aria-hidden />
          </span>
        )}
      </div>
    </Card>
  );
}
