import Link from "next/link";
import { Home } from "lucide-react";
import { PracticeSessionWorkspace } from "@/components/practice/PracticeSessionWorkspace";
import { redirectTeacherToDashboard } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { getPracticeSession } from "@/services/student/practice";

type PracticeSessionPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    message?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function PracticeSessionPage({
  params,
  searchParams
}: PracticeSessionPageProps) {
  await redirectTeacherToDashboard();

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [{ id }, query] = await Promise.all([params, searchParams]);
  const session = await getPracticeSession(user.id, id);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
      <PracticeSessionHeader message={query?.message} />
      <PracticeSessionWorkspace initialSession={session} />
    </main>
  );
}

function PracticeSessionHeader({ message }: { message?: string }) {
  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-clay">专项训练</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">做题页</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">
            5 道题可自由切换；查看答案后自行判断已掌握或未掌握。
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-ink/15 bg-white px-4 text-sm font-medium text-ink sm:h-10 sm:w-auto"
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
