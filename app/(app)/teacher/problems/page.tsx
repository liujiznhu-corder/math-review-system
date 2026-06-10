import Link from "next/link";
import { FilePenLine, Plus, Trash2 } from "lucide-react";
import { Pagination } from "@/components/pagination";
import { LatexProblemRenderer } from "@/components/problems/LatexProblemRenderer";
import { CascadingQuestionTypeFilters } from "@/components/question-types/CascadingQuestionTypeFilters";
import { SubmitButton } from "@/components/submit-button";
import {
  canManageQuestionTypes,
  getCurrentUserRole,
  redirectStudentToDashboard
} from "@/lib/roles";
import { getPaginationState } from "@/lib/pagination";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { deleteProblem, updateProblem } from "./actions";
import { CopyLatexButton } from "./copy-latex-button";

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
    level1?: string;
    level2?: string;
    level3?: string;
    questionTypeId?: string;
    source?: string;
    keyword?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ProblemsPage({ searchParams }: ProblemsPageProps) {
  const params = await searchParams;
  const filters = {
    level1: params?.level1 ?? "",
    level2: params?.level2 ?? "",
    level3: params?.level3 ?? "",
    questionTypeId: params?.questionTypeId ?? "",
    source: params?.source ?? "",
    keyword: params?.keyword ?? "",
    page: params?.page ?? "",
    pageSize: params?.pageSize ?? ""
  };
  const pagination = getPaginationState(params);

  await redirectStudentToDashboard();
  const role = await getCurrentUserRole();

  if (!canManageQuestionTypes(role)) {
    await redirectStudentToDashboard();
  }

  const supabase = await createClient();
  const { data: questionTypes } = await supabase
    .from("question_types")
    .select("id, level1, level2, level3")
    .eq("is_active", true)
    .order("level1", { ascending: true })
    .order("level2", { ascending: true })
    .order("level3", { ascending: true });
  const questionTypeOptions = (questionTypes ?? []) as QuestionTypeRow[];
  const matchingQuestionTypeIds = getMatchingQuestionTypeIds(
    questionTypeOptions,
    filters
  );
  const { data: problems, error, count } = await buildProblemsQuery({
    supabase,
    filters,
    questionTypeIds: matchingQuestionTypeIds,
    from: pagination.from,
    to: pagination.to
  });
  const normalizedProblems = normalizeProblems(
    (problems ?? []) as unknown as ProblemRawRow[]
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
            这里显示教师沉淀的原生 LaTeX 题目。题型库仍只在 /question-types 管理。
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
        <form className="grid gap-4 lg:grid-cols-3">
          <input type="hidden" name="page" value="1" />
          <CascadingQuestionTypeFilters
            questionTypes={questionTypeOptions}
            selectedLevel1={filters.level1}
            selectedLevel2={filters.level2}
            selectedLevel3={filters.level3}
            selectedQuestionTypeId={filters.questionTypeId}
            hiddenQuestionTypeIdName="questionTypeId"
            className="contents"
          />

          <label className="block text-sm font-medium text-ink">
            来源
            <input
              name="source"
              defaultValue={filters.source}
              placeholder="模糊搜索"
              className="mt-2 h-10 w-full rounded-md border border-ink/15 px-3 text-sm outline-none focus:border-moss"
            />
          </label>

          <label className="block text-sm font-medium text-ink lg:col-span-2">
            关键词搜索
            <input
              name="keyword"
              defaultValue={filters.keyword}
              placeholder="搜索 raw_latex / normalized_text"
              className="mt-2 h-10 w-full rounded-md border border-ink/15 px-3 text-sm outline-none focus:border-moss"
            />
          </label>

          <div className="flex gap-3 lg:col-span-3">
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
              清空
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
                  <Link
                    href={`/teacher/solutions/${problem.id}`}
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-moss px-3 text-sm font-medium text-white"
                  >
                    <FilePenLine className="h-4 w-4" />
                    答案解析
                  </Link>
                  <CopyLatexButton rawLatex={problem.raw_latex} />
                  <CopyLatexButton
                    rawLatex={problem.answer}
                    label="复制答案 LaTeX"
                  />
                  <CopyLatexButton
                    rawLatex={problem.analysis}
                    label="复制解析 LaTeX"
                  />
                  <details>
                    <summary className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-ink/15 bg-white px-3 text-sm font-medium text-ink">
                      查看 raw_latex
                    </summary>
                    <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-paper p-3 font-mono text-xs leading-5 text-ink/70">
                      {problem.raw_latex}
                    </pre>
                  </details>
                  <details>
                    <summary className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-ink/15 bg-white px-3 text-sm font-medium text-ink">
                      查看答案/解析源码
                    </summary>
                    <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-paper p-3 font-mono text-xs leading-5 text-ink/70">
                      {[
                        "answer:",
                        problem.answer ?? "",
                        "",
                        "analysis:",
                        problem.analysis ?? ""
                      ].join("\n")}
                    </pre>
                  </details>
                </div>

                <div className="mt-3 flex flex-wrap gap-3 text-sm leading-6 text-ink/55">
                  <span>
                    答案状态：{problem.answer?.trim() ? "已填写" : "待补充"}
                  </span>
                  <span>
                    解析状态：{problem.analysis?.trim() ? "已填写" : "待补充"}
                  </span>
                </div>

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
                  <SubmitButton
                    pendingText="删除中..."
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-clay/25 bg-clay/10 px-3 text-sm font-medium text-clay"
                  >
                    <Trash2 className="h-4 w-4" />
                    删除
                  </SubmitButton>
                </form>
              </article>
            ))}
          </div>
        )}
        <Pagination
          basePath="/teacher/problems"
          searchParams={filters}
          page={pagination.page}
          pageSize={pagination.pageSize}
          totalCount={count ?? 0}
        />
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
    <form
      action={updateProblem}
      className="mt-4 grid gap-4 rounded-md border border-ink/10 bg-paper p-4"
    >
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
      <TextArea name="source" label="来源" rows={2} value={problem.source} />
      <div>
        <SubmitButton
          pendingText="保存中..."
          className="inline-flex h-10 items-center rounded-md bg-moss px-4 text-sm font-medium text-white"
        >
          保存修改
        </SubmitButton>
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

async function buildProblemsQuery({
  supabase,
  filters,
  questionTypeIds,
  from,
  to
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  filters: {
    level1: string;
    level2: string;
    level3: string;
    questionTypeId: string;
    source: string;
    keyword: string;
  };
  questionTypeIds: string[] | null;
  from: number;
  to: number;
}) {
  if (questionTypeIds && questionTypeIds.length === 0) {
    return {
      data: [],
      error: null,
      count: 0
    };
  }

  let query = supabase
    .from("problems")
    .select(
      "id, problem_type, raw_latex, normalized_text, answer, analysis, source, question_type_id, created_at, question_types(id, level1, level2, level3)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (questionTypeIds) {
    query = query.in("question_type_id", questionTypeIds);
  }

  const normalizedSource = filters.source.trim();
  if (normalizedSource) {
    query = query.ilike("source", `%${normalizedSource}%`);
  }

  const normalizedKeyword = filters.keyword.trim();
  if (normalizedKeyword) {
    query = query.or(
      `raw_latex.ilike.%${normalizedKeyword}%,normalized_text.ilike.%${normalizedKeyword}%`
    );
  }

  return query.range(from, to);
}

function getMatchingQuestionTypeIds(
  questionTypes: QuestionTypeRow[],
  filters: {
    level1: string;
    level2: string;
    level3: string;
    questionTypeId: string;
  }
) {
  if (filters.questionTypeId) {
    return [filters.questionTypeId];
  }

  if (!filters.level1 && !filters.level2 && !filters.level3) {
    return null;
  }

  return questionTypes
    .filter(
      (questionType) =>
        (!filters.level1 || questionType.level1 === filters.level1) &&
        (!filters.level2 || questionType.level2 === filters.level2) &&
        (!filters.level3 || questionType.level3 === filters.level3)
    )
    .map((questionType) => questionType.id);
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
