export default function MistakesLoading() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <div className="h-4 w-24 rounded bg-ink/10" />
          <div className="h-8 w-40 rounded bg-ink/10" />
          <div className="h-4 w-80 max-w-full rounded bg-ink/10" />
        </div>
        <div className="h-10 w-28 rounded-md bg-ink/10" />
      </div>

      <section className="mt-8 rounded-md border border-ink/10 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <div className="h-4 w-20 rounded bg-ink/10" />
              <div className="h-10 rounded-md bg-ink/10" />
            </div>
          ))}
          <div className="flex gap-3 lg:col-span-3">
            <div className="h-10 w-20 rounded-md bg-ink/10" />
            <div className="h-10 w-20 rounded-md bg-ink/10" />
          </div>
        </div>
      </section>

      <section className="mt-8 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-28 rounded bg-ink/10" />
          <div className="h-4 w-16 rounded bg-ink/10" />
        </div>
        {Array.from({ length: 5 }).map((_, index) => (
          <article
            key={index}
            className="rounded-md border border-ink/10 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-3">
                <div className="h-4 w-48 rounded bg-ink/10" />
                <div className="h-5 w-36 rounded bg-ink/10" />
              </div>
              <div className="flex gap-2">
                <div className="h-7 w-20 rounded bg-ink/10" />
                <div className="h-7 w-24 rounded bg-ink/10" />
              </div>
            </div>
            <div className="mt-4 h-20 rounded-md bg-paper" />
          </article>
        ))}
      </section>
    </main>
  );
}
