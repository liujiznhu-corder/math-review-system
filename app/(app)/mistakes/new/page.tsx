import { redirectTeacherToDashboard } from "@/lib/roles";
import { getStudentSelectableQuestionTypes } from "@/services/student/mistakes";
import { MistakeEntryForm } from "./mistake-entry-form";

type NewMistakePageProps = {
  searchParams?: Promise<{
    message?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function NewMistakePage({
  searchParams
}: NewMistakePageProps) {
  await redirectTeacherToDashboard();

  const params = await searchParams;
  const questionTypes = await getStudentSelectableQuestionTypes();

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fbfaf6_0%,#f7f8fc_56%,#f4f7fb_100%)] px-4 py-5 sm:px-6 sm:py-7">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-2xl border border-ink/10 bg-white/90 p-5 shadow-sm sm:p-6">
          <p className="text-sm font-medium text-clay">错题录入</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">
            AI 录题助手 + LaTeX 预览
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">
            按“粘贴 LaTeX → 查看预览 → 推荐/选择题型 → 保存错题或提交审核”的顺序完成录入。确定题型就保存进复习计划，不确定时可以直接交给老师审核。
          </p>
        </div>

        <section className="mt-5">
          <MistakeEntryForm
            message={params?.message}
            questionTypes={questionTypes}
          />
        </section>
      </div>
    </main>
  );
}
