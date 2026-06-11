import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type Tone = "white" | "outlined" | "ivory" | "dark";

const toneClasses: Record<Tone, string> = {
  white: "bg-white shadow-sm",
  outlined: "bg-white border border-black/5",
  ivory: "bg-credios-ivory border border-black/5",
  dark: "bg-credios-charcoal text-white border border-white/10 shadow-lg",
};

export function Card({
  tone = "outlined",
  interactive = false,
  unpadded = false,
  className,
  children,
}: {
  tone?: Tone;
  interactive?: boolean;
  unpadded?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg",
        toneClasses[tone],
        !unpadded && "p-5 sm:p-6",
        interactive &&
          "hover:shadow-md hover:-translate-y-0.5 transition-[box-shadow,transform] duration-150 ease-out",
        className
      )}
    >
      {children}
    </div>
  );
}
