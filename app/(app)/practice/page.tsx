import Link from "next/link";
import { redirect } from "next/navigation";
import { Home } from "lucide-react";
import { PracticeStartForm } from "@/components/practice/PracticeStartForm";
import { redirectTeacherToDashboard } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { getPracticeOptions } from "@/services/student/practice";
import { startPracticeSession } from "./actions";

type PracticePageProps = {
  searchParams?: Promise<{
    sessionId?: string;
    message?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function PracticePage({ searchParams }: PracticePageProps) {
  await redirectTeacherToDashboard();

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const params = await searchParams;
  const options = await getPracticeOptions();

  if (params?.sessionId) {
    redirect(`/practice/session/${params.sessionId}`);
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8">
      <PracticeHeader message={params?.message} />
      <PracticeStartForm
        questionTypes={options.questionTypes}
        action={startPracticeSession}
      />
    </main>
  );
}

function PracticeHeader({ message }: { message?: string }) {
  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-clay">主动刷题</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">专项训练 V1</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">
            专项训练从教师题库抽题，和今日复习、薄弱巩固保持独立；未掌握题可以手动加入错题库。
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center gap-2 rounded-md border border-ink/15 bg-white px-4 text-sm font-medium text-ink"
        >
          <Home className="h-4 w-4" />
          返回首页
        </Link>
      </div>

      {message ? (
        <p className="mb-6 rounded-md border border-moss/20 bg-white px-4 py-3 text-sm text-moss">
          {message}
        </p>
      ) : null}
    </>
  );
}
