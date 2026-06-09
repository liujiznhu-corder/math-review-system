import { createClient } from "@/lib/supabase/server";
import {
  canManageQuestionTypes,
  getCurrentUserRole,
  redirectStudentToDashboard
} from "@/lib/roles";
import { ProblemForm } from "./problem-form";

type NewProblemPageProps = {
  searchParams?: Promise<{
    message?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function NewProblemPage({
  searchParams
}: NewProblemPageProps) {
  const params = await searchParams;
  await redirectStudentToDashboard();
  const role = await getCurrentUserRole();

  if (!canManageQuestionTypes(role)) {
    await redirectStudentToDashboard();
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("question_types")
    .select("id, level1, level2, level3")
    .eq("is_active", true)
    .order("level1", { ascending: true })
    .order("level2", { ascending: true })
    .order("level3", { ascending: true });

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8">
      <div>
        <p className="text-sm font-medium text-clay">教师题库</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">
          录入原生 LaTeX 题目
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">
          直接粘贴教师原始 LaTeX 代码。系统保存原文、生成分类用文本，并在页面中渲染预览。
        </p>
      </div>

      <section className="mt-8">
        <ProblemForm
          message={params?.message}
          questionTypes={(data ?? [])}
        />
      </section>
    </main>
  );
}
