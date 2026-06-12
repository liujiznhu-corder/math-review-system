import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ContextBackLink } from "@/components/navigation/ContextBackLink";
import { LatexContentRenderer } from "@/components/problems/LatexContentRenderer";
import { LatexProblemRenderer } from "@/components/problems/LatexProblemRenderer";
import { canManageQuestionTypes, getCurrentUserRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import {
  getStudentMistakeAnswerData,
  type StudentMistakeAnswer
} from "@/services/student/solutions";

type AnswerPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    message?: string;
    returnUrl?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function MistakeAnswerPage({
  params,
  searchParams
}: AnswerPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = await getCurrentUserRole();
  const canManage = canManageQuestionTypes(role);
  const answerData = await getStudentMistakeAnswerData({
    mistakeId: id,
    userId: user.id,
    canManage
  });

  if (!answerData) {
    notFound();
  }

  const {
    mistake,
    questionType,
    solution,
    answer,
    analysis,
    hasAnswerContent
  } = answerData;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-5 sm:px-6 sm:py-8">
      <ContextBackLink
        fallbackHref={canManage ? "/teacher/dashboard" : "/mistakes"}
        label={canManage ? "返回教师仪表盘" : "返回上一页"}
        returnUrl={query?.returnUrl}
      />

      <div className="mt-6">
        <p className="text-sm font-medium text-clay">错题答案</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">
          {questionType?.level3 ?? "未确认题型"}
        </h1>
        <p className="mt-2 text-sm text-ink/60">
          {questionType
            ? `${questionType.level1} / ${questionType.level2}`
            : "暂无题型"}
          {" · "}
          {getClassificationStatusLabel(mistake.classification_status)}
          {" · "}
          {formatDate(mistake.created_at)}
        </p>
      </div>

      {query?.message ? (
        <p className="mt-6 rounded-md border border-moss/20 bg-white px-4 py-3 text-sm text-moss">
          {query.message}
        </p>
      ) : null}

      <section className="mt-6 rounded-md border border-ink/10 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-semibold text-ink">题目</h2>
        <div className="mt-4 max-w-full overflow-x-auto rounded-md bg-paper p-4">
          {mistake.input_type === "latex" ? (
            <LatexProblemRenderer
              rawLatex={mistake.raw_latex ?? mistake.latex_content}
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-6 text-ink/75">
              {mistake.raw_text || mistake.stem}
            </p>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-md border border-ink/10 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-semibold text-ink">答案解析</h2>

        {!hasAnswerContent ? (
          <div className="mt-4 rounded-md border border-dashed border-ink/20 bg-paper px-4 py-8 text-center text-sm text-ink/60">
            答案解析暂未补充，请等待老师更新。
          </div>
        ) : (
          <div className="mt-4 grid gap-4">
            {answer?.trim() ? (
              <AnswerBlock title="答案" content={answer} />
            ) : null}
            {analysis?.trim() ? (
              <AnswerBlock title="解析" content={analysis} />
            ) : null}
          </div>
        )}

        {mistake.teacher_note?.trim() ? (
          <div className="mt-4 rounded-md border border-moss/20 bg-moss/5 p-4">
            <h3 className="text-sm font-semibold text-moss">教师备注</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-moss">
              {mistake.teacher_note}
            </p>
          </div>
        ) : null}
      </section>

      {canManage && solution ? (
        <div className="mt-6">
          <Link
            href={`/teacher/solutions/${solution.id}`}
            className="inline-flex h-11 w-full items-center justify-center rounded-md bg-moss px-4 text-sm font-medium text-white sm:h-10 sm:w-auto"
          >
            去答案解析中心维护
          </Link>
        </div>
      ) : null}
    </main>
  );
}

function AnswerBlock({ title, content }: { title: string; content: string }) {
  return (
    <div className="max-w-full overflow-x-auto rounded-md bg-paper p-4">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <div className="mt-2">
        <LatexContentRenderer content={content} />
      </div>
    </div>
  );
}

function getClassificationStatusLabel(
  status: StudentMistakeAnswer["classification_status"]
) {
  if (status === "teacher_confirmed") {
    return "教师已确认";
  }

  if (status === "student_selected") {
    return "学生已选择";
  }

  return "待教师审核";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
}
