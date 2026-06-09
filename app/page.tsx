import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="w-full max-w-3xl">
        <p className="mb-3 text-sm font-medium text-clay">江苏专转本数学</p>
        <h1 className="text-4xl font-semibold tracking-normal text-ink">
          错题复盘系统
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-ink/70">
          第一版支持题型库维护、手动录入错题、自动推荐题型、按周期生成复习任务，并保留 OCR 与 AI 分类服务接入位置。
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="inline-flex h-10 items-center rounded-md bg-moss px-4 text-sm font-medium text-white"
          >
            登录
          </Link>
        </div>
      </section>
    </main>
  );
}
