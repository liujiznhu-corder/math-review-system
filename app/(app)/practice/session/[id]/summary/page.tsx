import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PracticeSummaryWorkspace } from "@/components/practice/PracticeSummaryWorkspace";
import { redirectTeacherToDashboard } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { getPracticeSession } from "@/services/student/practice";

type PracticeSummaryPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function PracticeSummaryPage({
  params
}: PracticeSummaryPageProps) {
  await redirectTeacherToDashboard();

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { id } = await params;
  const session = await getPracticeSession(user.id, id);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-clay">专项训练</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">训练总结</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">
            选择真正需要复盘的未掌握题，加入错题库后会进入后续复习周期。
          </p>
        </div>
        <Link
          href={`/practice/session/${session.id}`}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-ink/15 bg-white px-4 text-sm font-medium text-ink sm:h-10 sm:w-auto"
        >
          <ArrowLeft className="h-4 w-4" />
          返回做题页
        </Link>
      </div>

      <PracticeSummaryWorkspace initialSession={session} />
    </main>
  );
}
