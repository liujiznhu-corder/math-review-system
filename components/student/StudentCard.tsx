import type { ReactNode } from "react";
import { clsx } from "clsx";

const paddingClasses = {
  sm: "p-4",
  md: "p-4 sm:p-5",
  lg: "p-5 sm:p-6"
};

const variantClasses = {
  default: "border-ink/10 bg-white shadow-sm",
  soft: "border-white/70 bg-white/80 shadow-sm backdrop-blur",
  tinted: "border-moss/10 bg-moss/5 shadow-sm",
  outline: "border-ink/10 bg-white/55"
};

export function StudentCard({
  children,
  className,
  padding = "md",
  variant = "default"
}: {
  children: ReactNode;
  className?: string;
  padding?: keyof typeof paddingClasses;
  variant?: keyof typeof variantClasses;
}) {
  return (
    <section
      className={clsx(
        "rounded-2xl border",
        paddingClasses[padding],
        variantClasses[variant],
        className
      )}
    >
      {children}
    </section>
  );
}
