import type { ReactNode } from "react";

export function StudentEmptyState({
  children
}: {
  children: ReactNode;
}) {
  return (
    <div className="mt-5 rounded-2xl border border-dashed border-ink/20 bg-white/60 px-4 py-8 text-center text-sm leading-6 text-ink/60">
      {children}
    </div>
  );
}
