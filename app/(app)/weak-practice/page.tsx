import Link from "next/link";
import { Target } from "lucide-react";
import { WeakPracticeSessionWorkspace } from "@/components/weak-practice/WeakPracticeSessionWorkspace";
import { redirectTeacherToDashboard } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { getTodayWeakPracticeData } from "@/services/student/weak-practice";

type WeakPracticePageProps = {
  searchParams?: Promise<{
    message?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function WeakPracticePage({
  searchParams
}: WeakPracticePageProps) {
  await redirectTeacherToDashboard();

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const params = await searchParams;
  const data = await getTodayWeakPracticeData(user.id);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-clay">薄弱巩固</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">
            今日薄弱巩固
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">
            每天从教师题库推荐 5 道题，优先覆盖你的薄弱题型。现在改成题号导航模式，适合 Web 和后续小程序统一体验。
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center gap-2 rounded-md border border-ink/15 bg-white px-4 text-sm font-medium text-ink"
        >
          <Target className="h-4 w-4" />
          返回首页
        </Link>
      </div>

      {params?.message ? (
        <p className="mt-6 rounded-md border border-moss/20 bg-white px-4 py-3 text-sm text-moss">
          {params.message}
        </p>
      ) : null}

      <WeakPracticeSessionWorkspace initialTasks={data.tasks} />
    </main>
  );
}
