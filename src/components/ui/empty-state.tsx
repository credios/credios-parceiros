import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Estado vazio que convida à ação — nunca um beco sem saída. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-neutral-200 bg-white px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-credios-blue-50">
        <Icon size={22} className="text-credios-blue" aria-hidden />
      </span>
      <h3 className="t-heading text-credios-charcoal">{title}</h3>
      <p className="t-body text-neutral-500 max-w-md">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
