import { cn } from "@/lib/cn";
import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  ReactNode,
} from "react";

const controlClasses =
  "w-full rounded-md border border-neutral-200 bg-white px-3.5 py-2.5 text-base sm:text-sm text-credios-charcoal placeholder:text-neutral-400 min-h-11 transition-colors duration-150 hover:border-neutral-300 focus:border-credios-blue focus:outline-none focus:ring-2 focus:ring-credios-blue/20 disabled:bg-neutral-50 disabled:text-neutral-400";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-credios-charcoal">
        {label}
        {required && <span className="text-status-danger ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="t-caption text-neutral-500">{hint}</p>}
      {error && (
        <p className="t-caption text-status-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClasses, className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controlClasses, "appearance-none", className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlClasses, "min-h-24", className)} {...props} />;
}

export function Checkbox({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn(
        "size-5 shrink-0 rounded-xs border-neutral-300 text-credios-blue accent-credios-blue cursor-pointer",
        className
      )}
      {...props}
    />
  );
}
