export default function PracticeLoading() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full max-w-2xl">
          <div className="h-4 w-24 animate-pulse rounded bg-ink/10" />
          <div className="mt-3 h-8 w-48 animate-pulse rounded bg-ink/10" />
          <div className="mt-3 h-4 w-full animate-pulse rounded bg-ink/10" />
          <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-ink/10" />
        </div>
        <div className="h-10 w-full animate-pulse rounded-md bg-ink/10 sm:w-28" />
      </div>

      <section className="rounded-md border border-ink/10 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full max-w-2xl">
            <div className="h-4 w-20 animate-pulse rounded bg-ink/10" />
            <div className="mt-3 h-7 w-72 max-w-full animate-pulse rounded bg-ink/10" />
            <div className="mt-3 h-4 w-full animate-pulse rounded bg-ink/10" />
          </div>
          <div className="h-14 w-full animate-pulse rounded-md bg-paper sm:w-36" />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="h-16 animate-pulse rounded-md bg-ink/10" />
          <div className="h-16 animate-pulse rounded-md bg-ink/10" />
          <div className="h-16 animate-pulse rounded-md bg-ink/10" />
        </div>

        <div className="mt-5 h-10 w-full animate-pulse rounded-md bg-moss/20 sm:w-28" />
      </section>
    </main>
  );
}
