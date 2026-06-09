import Link from "next/link";
import { Eye, Filter, Plus } from "lucide-react";
import { LatexProblemRenderer } from "@/components/problems/LatexProblemRenderer";
import { createClient } from "@/lib/supabase/server";
import { redirectTeacherToDashboard } from "@/lib/roles";
import type { Database } from "@/types/database";

type QuestionTypeRow = Pick<
  Database["public"]["Tables"]["question_types"]["Row"],
  "id" | "level1" | "level2" | "level3"
>;

type MistakeRow = Pick<
  Database["public"]["Tables"]["mistakes"]["Row"],
  | "id"
  | "stem"
  | "created_at"
  | "question_type_id"
  | "input_type"
  | "raw_text"
  | "raw_latex"
  | "latex_content"
  | "classification_status"
> & {
  question_types: QuestionTypeRow | null;
};

type MistakeRawRow = Omit<MistakeRow, "question_types"> & {
  question_types: QuestionTypeRow | QuestionTypeRow[] | null;
};

type MistakesPageProps = {
  searchParams?: Promise<{
    questionTypeId?: string;
    message?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function MistakesPage({ searchParams }: MistakesPageProps) {
  await redirectTeacherToDashboard();

  const params = await searchParams;
  const selectedQuestionTypeId = params?.questionTypeId ?? "";
  const supabase = await createClient();

  const [{ data: questionTypes }, mistakesResult] = await Promise.all([
    supabase
      .from("question_types")
      .select("id, level1, level2, level3")
      .eq("is_active", true)
      .order("level1", { ascending: true })
      .order("level2", { ascending: true })
      .order("level3", { ascending: true }),
    getMistakes(selectedQuestionTypeId)
  ]);

  const mistakes = normalizeMistakes(
    (mistakesResult.data ?? []) as unknown as MistakeRawRow[]
  );

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-clay">个人错题库</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">错题库</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">
            默认只展示题目、所属题型、分类状态和录入时间；答案解析单独进入详情页查看。
          </p>
        </div>
        <Link
          href="/mistakes/new"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-moss px-4 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" />
          录入错题
        </Link>
      </div>

      {params?.message ? (
        <p className="mt-6 rounded-md border border-moss/20 bg-white px-4 py-3 text-sm text-moss">
          {params.message}
        </p>
      ) : null}

      {mistakesResult.error ? (
        <p className="mt-6 rounded-md border border-clay/30 bg-clay/10 px-4 py-3 text-sm text-clay">
          {mistakesResult.error.message}
        </p>
      ) : null}

      <section className="mt-8 rounded-md border border-ink/10 bg-white p-5 shadow-sm">
        <form className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1 text-sm font-medium text-ink">
            <span className="inline-flex items-center gap-2">
              <Filter className="h-4 w-4 text-moss" />
              按题型筛选
            </span>
            <select
              name="questionTypeId"
              defaultValue={selectedQuestionTypeId}
              className="mt-2 h-10 w-full rounded-md border border-ink/15 bg-white px-3 text-sm outline-none focus:border-moss"
            >
              <option value="">全部题型</option>
              {(questionTypes ?? []).map((questionType) => (
                <option key={questionType.id} value={questionType.id}>
                  {questionType.level1} / {questionType.level2} /{" "}
                  {questionType.level3}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-md border border-ink/15 px-4 text-sm font-medium text-ink"
          >
            筛选
          </button>
          {selectedQuestionTypeId ? (
            <Link
              href="/mistakes"
              className="inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium text-ink/65 hover:text-ink"
            >
              清除
            </Link>
          ) : null}
        </form>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">错题列表</h2>
          <p className="text-sm text-ink/60">共 {mistakes.length} 条</p>
        </div>

        {mistakes.length === 0 ? (
          <div className="mt-4 rounded-md border border-dashed border-ink/20 bg-white px-5 py-10 text-center text-sm text-ink/60">
            暂无错题。先录入一道题并确认题型。
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {mistakes.map((mistake) => (
              <article
                key={mistake.id}
                className="rounded-md border border-ink/10 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm text-ink/55">
                      {mistake.question_types
                        ? `${mistake.question_types.level1} / ${mistake.question_types.level2}`
                        : "未分类"}
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-ink">
                      {mistake.question_types?.level3 ?? "未确认题型"}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-md bg-paper px-2 py-1 text-xs text-ink/65">
                      {getClassificationStatusLabel(
                        mistake.classification_status
                      )}
                    </span>
                    <span className="rounded-md bg-paper px-2 py-1 text-xs text-ink/65">
                      {formatDate(mistake.created_at)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 rounded-md bg-paper p-4">
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

                <div className="mt-4">
                  <Link
                    href={`/mistakes/${mistake.id}/answer`}
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-ink/15 bg-white px-3 text-sm font-medium text-ink hover:border-moss/40 hover:text-moss"
                  >
                    <Eye className="h-4 w-4" />
                    查看答案
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function normalizeMistakes(rows: MistakeRawRow[]): MistakeRow[] {
  return rows.map((row) => ({
    ...row,
    question_types: Array.isArray(row.question_types)
      ? (row.question_types[0] ?? null)
      : row.question_types
  }));
}

async function getMistakes(questionTypeId: string) {
  const supabase = await createClient();
  let query = supabase
    .from("mistakes")
    .select(
      "id, stem, created_at, question_type_id, input_type, raw_text, raw_latex, latex_content, classification_status, question_types(id, level1, level2, level3)"
    )
    .order("created_at", { ascending: false });

  if (questionTypeId) {
    query = query.eq("question_type_id", questionTypeId);
  }

  return query;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
}

function getClassificationStatusLabel(
  status: MistakeRow["classification_status"]
) {
  if (status === "teacher_confirmed") {
    return "教师已确认";
  }

  if (status === "student_selected") {
    return "学生已选择";
  }

  return "待教师审核";
}
