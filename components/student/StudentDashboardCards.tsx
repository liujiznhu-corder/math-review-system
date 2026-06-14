import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { clsx } from "clsx";

import { StudentCard } from "@/components/student/StudentCard";

const toneClasses = {
  neutral: "bg-ink/5 text-ink/50",
  moss: "bg-moss/10 text-moss",
  sky: "bg-sky-100 text-sky-700",
  indigo: "bg-indigo-100 text-indigo-700",
  emerald: "bg-emerald-100 text-emerald-700",
  clay: "bg-clay/10 text-clay"
};

export function StudentActionCard({
  href,
  icon: Icon,
  title,
  description,
  meta,
  cta,
  featured = false,
  tone = "moss"
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  meta?: string;
  cta?: string;
  featured?: boolean;
  tone?: keyof typeof toneClasses;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "group rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-moss/30 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-moss/30",
        featured ? "border-moss/25 ring-1 ring-moss/10" : "border-ink/10"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <span
          className={clsx(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            toneClasses[tone]
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <ArrowRight className="mt-1 h-4 w-4 text-ink/35 transition group-hover:translate-x-0.5 group-hover:text-moss" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-ink">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-ink/60">{description}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {meta ? (
          <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-medium text-ink/60">
            {meta}
          </span>
        ) : null}
        {cta ? (
          <span className="text-xs font-semibold text-moss">{cta}</span>
        ) : null}
      </div>
    </Link>
  );
}

export function StudentStatCard({
  icon: Icon,
  label,
  value,
  helper,
  badge,
  tone = "moss"
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  helper: string;
  badge?: string;
  tone?: keyof typeof toneClasses;
}) {
  return (
    <StudentCard className="min-h-full" padding="md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink/55">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-ink">{value}</p>
        </div>
        <span
          className={clsx(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            toneClasses[tone]
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-ink/50">{helper}</p>
      {badge ? (
        <span className="mt-3 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
          {badge}
        </span>
      ) : null}
    </StudentCard>
  );
}

export function StudentSectionCard({
  icon: Icon,
  title,
  description,
  children
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <StudentCard className="min-h-full">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-moss/10 text-moss">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-ink/60">{description}</p>
        </div>
      </div>
      {children}
    </StudentCard>
  );
}

export function StudentSummaryCard({
  label,
  value,
  helper
}: {
  label: string;
  value: number;
  helper: string;
}) {
  return (
    <div className="rounded-xl border border-ink/10 bg-paper/70 px-4 py-4">
      <p className="text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-2 text-sm font-medium text-ink">{label}</p>
      <p className="mt-1 text-xs leading-5 text-ink/55">{helper}</p>
    </div>
  );
}

export function StudentProgressBar({ value }: { value: number }) {
  return (
    <div className="mt-2 h-2 rounded-full bg-ink/10">
      <div
        className="h-2 rounded-full bg-moss"
        style={{ width: `${Math.max(0, Math.min(value, 100))}%` }}
      />
    </div>
  );
}
