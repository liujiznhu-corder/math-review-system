import Link from "next/link";
import { FilePenLine, Plus, Trash2 } from "lucide-react";
import { LatexProblemRenderer } from "@/components/problems/LatexProblemRenderer";
import { createClient } from "@/lib/supabase/server";
import {
  canManageQuestionTypes,
  getCurrentUserRole,
  redirectStudentToDashboard
} from "@/lib/roles";
import { deleteProblem, updateProblem } from "./actions";
import { CopyLatexButton } from "./copy-latex-button";
import type { Database } from "@/types/database";

type QuestionTypeRow = Pick<
  Database["public"]["Tables"]["question_types"]["Row"],
  "id" | "level1" | "level2" | "level3"
>;

type ProblemRow = Pick<
  Database["public"]["Tables"]["problems"]["Row"],
  | "id"
  | "problem_type"
  | "raw_latex"
  | "normalized_text"
  | "answer"
  | "analysis"
  | "source"
  | "question_type_id"
  | "created_at"
> & {
  question_types: QuestionTypeRow | null;
};

type ProblemRawRow = Omit<ProblemRow, "question_types"> & {
  question_types: QuestionTypeRow | QuestionTypeRow[] | null;
};

type ProblemsPageProps = {
  searchParams?: Promise<{
    message?: string;
    problemType?: string;
    level1?: string;
    level2?: string;
    questionTypeId?: string;
    source?: string;
    keyword?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ProblemsPage({ searchParams }: ProblemsPageProps) {
  const params = await searchParams;
  const filters = {
    problemType: params?.problemType ?? "",
    level1: params?.level1 ?? "",
    level2: params?.level2 ?? "",
    questionTypeId: params?.questionTypeId ?? "",
    source: params?.source ?? "",
    keyword: params?.keyword ?? ""
  };
  await redirectStudentToDashboard();
  const role = await getCurrentUserRole();

  if (!canManageQuestionTypes(role)) {
    await redirectStudentToDashboard();
  }

  const supabase = await createClient();
  const [{ data: questionTypes }, { data: problems, error }] =
    await Promise.all([
      supabase
        .from("question_types")
        .select("id, level1, level2, level3")
        .eq("is_active", true)
        .order("level1", { ascending: true })
        .order("level2", { ascending: true })
        .order("level3", { ascending: true }),
      supabase
        .from("problems")
        .select(
          "id, problem_type, raw_latex, normalized_text, answer, analysis, source, question_type_id, created_at, question_types(id, level1, level2, level3)"
        )
        .order("created_at", { ascending: false })
    ]);
  const questionTypeOptions = (questionTypes ?? []) as QuestionTypeRow[];
  const normalizedProblems = filterProblems(
    normalizeProblems((problems ?? []) as unknown as ProblemRawRow[]),
    filters
  );

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-clay">教师题库</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">
            已录入题目
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">
            这里显示教师沉淀的原生 LaTeX 题目。题型库仍只在 `/question-types`
            管理。
          </p>
        </div>
        <Link
          href="/teacher/problems/new"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-moss px-4 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" />
          录入题目
        </Link>
      </div>

      {params?.message ? (
        <p className="mt-6 rounded-md border border-moss/20 bg-white px-4 py-3 text-sm text-moss">
          {params.message}
        </p>
      ) : null}

      {error ? (
        <p className="mt-6 rounded-md border border-clay/30 bg-clay/10 px-4 py-3 text-sm text-clay">
          {error.message}
        </p>
      ) : null}

      <section className="mt-8 rounded-md border border-ink/10 bg-white p-5 shadow-sm">
        <form className="grid gap-4 lg:grid-cols-6">
          <label className="block text-sm font-medium text-ink">
            题目类型
            <select
              name="problemType"
              defaultValue={filters.problemType}
              className="mt-2 h-10 w-full rounded-md border border-ink/15 bg-white px-3 text-sm outline-none focus:border-moss"
            >
              <option value="">全部</option>
              <option value="single_choice">单选题</option>
              <option value="fill_blank">填空题</option>
              <option value="calculation">计算题</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-ink">
            一级分类
            <select
              name="level1"
              defaultValue={filters.level1}
              className="mt-2 h-10 w-full rounded-md border border-ink/15 bg-white px-3 text-sm outline-none focus:border-moss"
            >
              <option value="">全部</option>
              {unique(questionTypeOptions.map((item) => item.level1)).map(
                (level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                )
              )}
            </select>
          </label>
          <label className="block text-sm font-medium text-ink">
            二级分类
            <select
              name="level2"
              defaultValue={filters.level2}
              className="mt-2 h-10 w-full rounded-md border border-ink/15 bg-white px-3 text-sm outline-none focus:border-moss"
            >
              <option value="">全部</option>
              {unique(
                questionTypeOptions
                  .filter(
                    (item) => !filters.level1 || item.level1 === filters.level1
                  )
                  .map((item) => item.level2)
              ).map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-ink">
            三级题型
            <select
              name="questionTypeId"
              defaultValue={filters.questionTypeId}
              className="mt-2 h-10 w-full rounded-md border border-ink/15 bg-white px-3 text-sm outline-none focus:border-moss"
            >
              <option value="">全部</option>
              {questionTypeOptions
                .filter(
                  (item) =>
                    (!filters.level1 || item.level1 === filters.level1) &&
                    (!filters.level2 || item.level2 === filters.level2)
                )
                .map((questionType) => (
                  <option key={questionType.id} value={questionType.id}>
                    {questionType.level3}
                  </option>
                ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-ink">
            来源
            <input
              name="source"
              defaultValue={filters.source}
              placeholder="模糊搜索"
              className="mt-2 h-10 w-full rounded-md border border-ink/15 px-3 text-sm outline-none focus:border-moss"
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            关键词
            <input
              name="keyword"
              defaultValue={filters.keyword}
              placeholder="搜 raw_latex / 文本"
              className="mt-2 h-10 w-full rounded-md border border-ink/15 px-3 text-sm outline-none focus:border-moss"
            />
          </label>
          <div className="flex gap-3 lg:col-span-6">
            <button
              type="submit"
              className="inline-flex h-10 items-center rounded-md bg-moss px-4 text-sm font-medium text-white"
            >
              筛选
            </button>
            <Link
              href="/teacher/problems"
              className="inline-flex h-10 items-center rounded-md px-4 text-sm font-medium text-ink/65 hover:text-ink"
            >
              清除
            </Link>
          </div>
        </form>
      </section>

      <section className="mt-8">
        {normalizedProblems.length === 0 ? (
          <div className="rounded-md border border-dashed border-ink/20 bg-white px-5 py-10 text-center text-sm text-ink/60">
            暂无题目。先录入一道原生 LaTeX 题目。
          </div>
        ) : (
          <div className="space-y-5">
            {normalizedProblems.map((problem) => (
              <article
                key={problem.id}
                className="rounded-md border border-ink/10 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm text-ink/55">
                      {problem.question_types
                        ? `${problem.question_types.level1} / ${problem.question_types.level2}`
                        : "未指定题型"}
                    </p>
                    <h2 className="mt-1 text-base font-semibold text-ink">
                      {problem.question_types?.level3 ?? "教师题目"}
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-md bg-paper px-2 py-1 text-xs text-ink/65">
                      {getProblemTypeLabel(problem.problem_type)}
                    </span>
                    <span className="rounded-md bg-paper px-2 py-1 text-xs text-ink/65">
                      {formatDate(problem.created_at)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 rounded-md bg-paper p-4">
                  <LatexProblemRenderer rawLatex={problem.raw_latex} />
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <CopyLatexButton rawLatex={problem.raw_latex} />
                  <details>
                    <summary className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-ink/15 bg-white px-3 text-sm font-medium text-ink">
                      查看 raw_latex
                    </summary>
                    <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-paper p-3 font-mono text-xs leading-5 text-ink/70">
                      {problem.raw_latex}
                    </pre>
                  </details>
                </div>

                {problem.answer ? (
                  <p className="mt-3 text-sm leading-6 text-ink/65">
                    答案：{problem.answer}
                  </p>
                ) : null}
                {problem.analysis ? (
                  <p className="mt-3 text-sm leading-6 text-ink/65">
                    解析：{problem.analysis}
                  </p>
                ) : null}
                {problem.source ? (
                  <p className="mt-3 text-sm leading-6 text-ink/55">
                    来源：{problem.source}
                  </p>
                ) : null}

                <details className="mt-5">
                  <summary className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-moss">
                    <FilePenLine className="h-4 w-4" />
                    编辑题目
                  </summary>
                  <ProblemEditForm
                    problem={problem}
                    questionTypes={questionTypeOptions}
                  />
                </details>

                <form action={deleteProblem} className="mt-4">
                  <input type="hidden" name="id" value={problem.id} />
                  <button
                    type="submit"
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-clay/25 bg-clay/10 px-3 text-sm font-medium text-clay"
                  >
                    <Trash2 className="h-4 w-4" />
                    删除
                  </button>
                </form>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function ProblemEditForm({
  problem,
  questionTypes
}: {
  problem: ProblemRow;
  questionTypes: QuestionTypeRow[];
}) {
  return (
    <form action={updateProblem} className="mt-4 grid gap-4 rounded-md border border-ink/10 bg-paper p-4">
      <input type="hidden" name="id" value={problem.id} />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium text-ink">
          题目类型
          <select
            name="problemType"
            defaultValue={problem.problem_type}
            className="mt-2 h-10 w-full rounded-md border border-ink/15 bg-white px-3 text-sm outline-none focus:border-moss"
          >
            <option value="single_choice">单选题</option>
            <option value="fill_blank">填空题</option>
            <option value="calculation">计算题</option>
          </select>
        </label>
        <label className="block text-sm font-medium text-ink">
          所属题型
          <select
            name="questionTypeId"
            defaultValue={problem.question_type_id ?? ""}
            className="mt-2 h-10 w-full rounded-md border border-ink/15 bg-white px-3 text-sm outline-none focus:border-moss"
          >
            <option value="">暂不指定题型</option>
            {questionTypes.map((questionType) => (
              <option key={questionType.id} value={questionType.id}>
                {questionType.level1} / {questionType.level2} /{" "}
                {questionType.level3}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-sm font-medium text-ink">
        raw_latex
        <textarea
          name="rawLatex"
          required
          rows={10}
          defaultValue={problem.raw_latex}
          className="mt-2 w-full rounded-md border border-ink/15 px-3 py-2 font-mono text-sm leading-6 outline-none focus:border-moss"
        />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <TextArea name="source" label="来源" rows={2} value={problem.source} />
        <TextArea name="answer" label="答案" rows={2} value={problem.answer} />
      </div>
      <TextArea name="analysis" label="解析" rows={4} value={problem.analysis} />
      <div>
        <button
          type="submit"
          className="inline-flex h-10 items-center rounded-md bg-moss px-4 text-sm font-medium text-white"
        >
          保存修改
        </button>
      </div>
    </form>
  );
}

function TextArea({
  name,
  label,
  rows,
  value
}: {
  name: string;
  label: string;
  rows: number;
  value?: string | null;
}) {
  return (
    <label className="block text-sm font-medium text-ink">
      {label}
      <textarea
        name={name}
        rows={rows}
        defaultValue={value ?? ""}
        className="mt-2 w-full rounded-md border border-ink/15 px-3 py-2 text-sm leading-6 outline-none focus:border-moss"
      />
    </label>
  );
}

function normalizeProblems(rows: ProblemRawRow[]): ProblemRow[] {
  return rows.map((row) => ({
    ...row,
    question_types: Array.isArray(row.question_types)
      ? (row.question_types[0] ?? null)
      : row.question_types
  }));
}

function filterProblems(
  problems: ProblemRow[],
  filters: {
    problemType: string;
    level1: string;
    level2: string;
    questionTypeId: string;
    source: string;
    keyword: string;
  }
) {
  const normalizedSource = filters.source.trim().toLowerCase();
  const normalizedKeyword = filters.keyword.trim().toLowerCase();

  return problems.filter((problem) => {
    if (filters.problemType && problem.problem_type !== filters.problemType) {
      return false;
    }

    if (
      filters.questionTypeId &&
      problem.question_type_id !== filters.questionTypeId
    ) {
      return false;
    }

    if (filters.level1 && problem.question_types?.level1 !== filters.level1) {
      return false;
    }

    if (filters.level2 && problem.question_types?.level2 !== filters.level2) {
      return false;
    }

    if (
      normalizedSource &&
      !(problem.source ?? "").toLowerCase().includes(normalizedSource)
    ) {
      return false;
    }

    if (normalizedKeyword) {
      const searchable = `${problem.raw_latex} ${
        problem.normalized_text ?? ""
      }`.toLowerCase();

      if (!searchable.includes(normalizedKeyword)) {
        return false;
      }
    }

    return true;
  });
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getProblemTypeLabel(value: ProblemRow["problem_type"]) {
  if (value === "single_choice") {
    return "单选题";
  }

  if (value === "fill_blank") {
    return "填空题";
  }

  return "计算题";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
}
