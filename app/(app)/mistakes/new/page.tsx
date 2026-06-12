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
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
      <div>
        <p className="text-sm font-medium text-clay">错题录入</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">
          AI 录题助手 + LaTeX 预览
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">
          暂时不接 OCR，也不接入 AI API。请使用外部 AI 工具把题目图片转成系统规定格式的 LaTeX，再粘贴到本页面完成预览、推荐题型和保存。
        </p>
      </div>

      <section className="mt-8">
        <MistakeEntryForm
          message={params?.message}
          questionTypes={questionTypes}
        />
      </section>
    </main>
  );
}
