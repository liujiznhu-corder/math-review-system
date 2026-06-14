export function StudentLoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-3 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
      <div className="h-4 w-1/3 rounded-full bg-ink/10" />
      <div className="h-8 w-2/3 rounded-full bg-ink/10" />
      <div className="h-4 w-full rounded-full bg-ink/10" />
      <div className="h-4 w-5/6 rounded-full bg-ink/10" />
    </div>
  );
}
