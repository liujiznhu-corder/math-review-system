import type { ReactNode } from "react";
import { clsx } from "clsx";

const maxWidthClasses = {
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl"
};

export function StudentPageShell({
  children,
  maxWidth = "6xl",
  className
}: {
  children: ReactNode;
  maxWidth?: keyof typeof maxWidthClasses;
  className?: string;
}) {
  return (
    <main
      className={clsx(
        "min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(49,88,70,0.08),transparent_34rem),linear-gradient(180deg,#fbfaf6_0%,#f8f6f0_48%,#f4f7fb_100%)] px-4 py-5 sm:px-6 sm:py-8",
        className
      )}
    >
      <div className={clsx("mx-auto w-full", maxWidthClasses[maxWidth])}>
        {children}
      </div>
    </main>
  );
}
