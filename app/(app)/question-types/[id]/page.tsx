import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FilePenLine } from "lucide-react";
import { LatexProblemRenderer } from "@/components/problems/LatexProblemRenderer";
import { DeleteQuestionTypeButton } from "@/components/question-types/DeleteQuestionTypeButton";
import {
  canManageQuestionTypes,
  getCurrentUserRole,
  redirectStudentToDashboard
} from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { deleteQuestionType } from "../actions";

type QuestionTypeRow = Database["public"]["Tables"]["question_types"]["Row"];
type ExampleRow = Pick<
  Database["public"]["Tables"]["question_type_examples"]["Row"],
  "id" | "example_text" | "solution_hint"
>;

type QuestionTypeWithExamples = QuestionTypeRow & {
  question_type_examples: ExampleRow[];
};

type QuestionTypeDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    message?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function QuestionTypeDetailPage({
  params,
  searchParams
}: QuestionTypeDetailPageProps) {
  await redirectStudentToDashboard();
  const role = await getCurrentUserRole();

  if (!canManageQuestionTypes(role)) {
    await redirectStudentToDashboard();
  }

  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("question_types")
    .select(
      "id, level1, level2, level3, keywords, description, is_active, created_by, created_at, updated_at, question_type_examples(id, example_text, solution_hint)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!data && !error) {
    notFound();
  }

  const questionType = data as QuestionTypeWithExamples | null;

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/question-types"
        className="inline-flex items-center gap-2 text-sm font-medium text-ink/65 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        返回题型库
      </Link>

      {query?.message || error ? (
        <p className="mt-6 rounded-md border border-clay/30 bg-clay/10 px-4 py-3 text-sm text-clay">
          {query?.message ?? error?.message}
        </p>
      ) : null}

      {questionType ? (
        <>
          <section className="mt-6 rounded-md border border-ink/10 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-medium text-clay">题型详情</p>
                <p className="mt-3 text-sm text-ink/55">
                  {questionType.level1} / {questionType.level2}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold text-ink">
                    {questionType.level3}
                  </h1>
                  <StatusBadge active={questionType.is_active} />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/question-types/${questionType.id}/edit`}
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-3 text-sm font-medium text-white hover:bg-ink/90"
                >
                  <FilePenLine className="h-4 w-4" />
                  编辑题型
                </Link>
                <DeleteQuestionTypeButton
                  id={questionType.id}
                  action={deleteQuestionType}
                  label="删除题型"
                />
              </div>
            </div>
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <article className="rounded-md border border-ink/10 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-ink">题型说明</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink/70">
                {questionType.description || "暂无题型说明。"}
              </p>

              <h2 className="mt-6 text-base font-semibold text-ink">
                识别特征
              </h2>
              {questionType.keywords.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {questionType.keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="rounded-md bg-paper px-2.5 py-1 text-sm text-ink/70"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-ink/50">暂无识别特征。</p>
              )}
            </article>

            <article className="rounded-md border border-ink/10 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-ink">
                    代表例题预览
                  </h2>
                  <p className="mt-1 text-sm text-ink/55">
                    共 {questionType.question_type_examples.length} 道代表例题
                  </p>
                </div>
              </div>

              {questionType.question_type_examples.length > 0 ? (
                <div className="mt-4 space-y-4">
                  {questionType.question_type_examples.map((example, index) => (
                    <section
                      key={example.id}
                      className="rounded-md border border-ink/10 bg-paper p-4"
                    >
                      <p className="mb-3 text-sm font-medium text-ink/60">
                        例题 {index + 1}
                      </p>
                      <LatexProblemRenderer rawLatex={example.example_text} />
                      {example.solution_hint ? (
                        <p className="mt-3 rounded-md bg-white px-3 py-2 text-xs leading-5 text-ink/60">
                          提示：{example.solution_hint}
                        </p>
                      ) : null}
                    </section>
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-md border border-dashed border-ink/20 bg-paper px-4 py-8 text-center text-sm text-ink/55">
                  暂无代表例题。
                </p>
              )}
            </article>
          </section>
        </>
      ) : null}
    </main>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={[
        "rounded-md px-2 py-1 text-xs font-medium",
        active ? "bg-moss/10 text-moss" : "bg-ink/5 text-ink/55"
      ].join(" ")}
    >
      {active ? "已启用" : "已停用"}
    </span>
  );
}
