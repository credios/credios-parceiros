import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-credios-blue text-white shadow-sm border border-credios-blue-300/30 hover:brightness-110",
  secondary:
    "bg-credios-gold text-credios-charcoal shadow-sm hover:brightness-110",
  outline:
    "bg-white text-credios-blue border border-credios-blue/60 hover:bg-credios-blue-50",
  ghost: "bg-transparent text-credios-blue hover:bg-credios-blue-50",
  danger:
    "bg-white text-status-danger border border-status-danger/40 hover:bg-status-danger-bg",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3.5 py-2 text-sm min-h-9",
  md: "px-5 py-2.5 text-sm min-h-11",
  lg: "px-6 py-3 text-base min-h-12",
};

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-[filter,background-color,color,box-shadow,transform] duration-150 ease-out active:translate-y-px disabled:opacity-50 disabled:pointer-events-none cursor-pointer";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      {...props}
    />
  );
}

interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      {...props}
    >
      {children}
    </Link>
  );
}
