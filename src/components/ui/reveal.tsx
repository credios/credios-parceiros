"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Fade + slide-up ao entrar na viewport (CSS em globals.css, sem framer-motion). */
export function Reveal({
  children,
  delay = 0,
  y = 20,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.setAttribute("data-reveal-visible", "");
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal
      className={className}
      style={
        {
          "--reveal-delay": `${delay}ms`,
          "--reveal-y": `${y}px`,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
