import Link from "next/link";
import type { ReactNode } from "react";
import { clsx } from "clsx";

const variantClasses = {
  primary: "bg-moss text-white hover:bg-moss/90",
  secondary:
    "border border-ink/15 bg-white text-ink hover:border-moss/40 hover:text-moss",
  ghost: "text-ink/65 hover:bg-white hover:text-ink"
};

export function StudentButton({
  children,
  href,
  variant = "primary",
  className
}: {
  children: ReactNode;
  href?: string;
  variant?: keyof typeof variantClasses;
  className?: string;
}) {
  const classes = clsx(
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition sm:h-10",
    variantClasses[variant],
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={classes}>
      {children}
    </button>
  );
}
