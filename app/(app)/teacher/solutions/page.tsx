import Link from "next/link";
import { FilePenLine, LibraryBig, Search } from "lucide-react";
import { Pagination } from "@/components/pagination";
import { LatexProblemRenderer } from "@/components/problems/LatexProblemRenderer";
import { CascadingQuestionTypeFilters } from "@/components/question-types/CascadingQuestionTypeFilters";
import {
  canManageQuestionTypes,
  getCurrentUserRole,
  redirectStudentToDashboard
} from "@/lib/roles";
import { getPaginationState } from "@/lib/pagination";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import { CopyLatexButton } from "../problems/copy-latex-button";
import { addMistakeToProblemLibrary } from "./actions";

type QuestionTypeRow = Pick<
  Database["public"]["Tables"]["question_types"]["Row"],
  "id" | "level1" | "level2" | "level3"
>;

type ProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "email" | "full_name"
>;

type ProblemRow = Pick<
  Database["public"]["Tables"]["problems"]["Row"],
  | "id"
  | "created_by"
  | "question_type_id"
  | "problem_type"
  | "raw_latex"
  | "normalized_text"
  | "answer"
  | "analysis"
  | "source"
  | "source_type"
  | "source_mistake_id"
  | "updated_at"
> & {
  question_types: QuestionTypeRow | QuestionTypeRow[] | null;
};

type MistakeRow = Pick<
  Database["public"]["Tables"]["mistakes"]["Row"],
  | "id"
  | "user_id"
  | "question_type_id"
  | "problem_type"
  | "stem"
  | "raw_latex"
  | "latex_content"
  | "normalized_stem"
  | "answer"
  | "analysis"
  | "source"
  | "updated_at"
> & {
  question_types: QuestionTypeRow | QuestionTypeRow[] | null;
};

type SolutionRow = {
  id: string;
  routeId: string;
  solutionType: "problem" | "mistake";
  createdBy: string | null;
  questionTypeId: string | null;
  problemType: "single_choice" | "fill_blank" | "calculation";
  rawLatex: string;
  normalizedText: string | null;
  answer: string | null;
  analysis: string | null;
  source: string | null;
  sourceType: "teacher_created" | "student_submitted";
  sourceMistakeId: string | null;
  isInProblemLibrary: boolean;
  updatedAt: string;
  questionType: QuestionTypeRow | null;
  submitter: ProfileRow | null;
};

type SolutionsPageProps = {
  searchParams?: Promise<{
    message?: string;
    level1?: string;
    level2?: string;
    level3?: string;
    questionTypeId?: string;
    status?: string;
    sourceType?: string;
    keyword?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function SolutionsPage({
  searchParams
}: SolutionsPageProps) {
  await redirectStudentToDashboard();
  const role = await getCurrentUserRole();

  if (!canManageQuestionTypes(role)) {
    await redirectStudentToDashboard();
  }

  const params = await searchParams;
  const filters = {
    level1: params?.level1 ?? "",
    level2: params?.level2 ?? "",
    level3: params?.level3 ?? "",
    questionTypeId: params?.questionTypeId ?? "",
    status: params?.status ?? "",
    sourceType: params?.sourceType ?? "",
    keyword: params?.keyword ?? "",
    page: params?.page,
    pageSize: params?.pageSize
  };
  const pagination = getPaginationState(params);

  const admin = createAdminClient();
  const [
    { data: questionTypes },
    { data: problems, error: problemsError, count: problemsCount },
    { data: mistakes, error: mistakesError, count: mistakesCount }
  ] = await Promise.all([
    admin
      .from("question_types")
      .select("id, level1, level2, level3")
      .eq("is_active", true)
      .order("level1", { ascending: true })
      .order("level2", { ascending: true })
      .order("level3", { ascending: true }),
    admin
      .from("problems")
      .select(
        "id, created_by, question_type_id, problem_type, raw_latex, normalized_text, answer, analysis, source, source_type, source_mistake_id, updated_at, question_types(id, level1, level2, level3)",
        { count: "exact" }
      )
      .order("updated_at", { ascending: false })
      .range(0, pagination.to),
    admin
      .from("mistakes")
      .select(
        "id, user_id, question_type_id, problem_type, stem, raw_latex, latex_content, normalized_stem, answer, analysis, source, updated_at, question_types(id, level1, level2, level3)",
        { count: "exact" }
      )
      .not("question_type_id", "is", null)
      .in("classification_status", ["student_selected", "teacher_confirmed"])
      .order("updated_at", { ascending: false })
      .range(0, pagination.to)
  ]);

  const problemRows = normalizeProblemRows(
    (problems ?? []) as unknown as ProblemRow[]
  );
  const problemMistakeIds = new Set(
    problemRows
      .map((row) => row.sourceMistakeId)
      .filter((id): id is string => Boolean(id))
  );
  const orphanMistakeRows = normalizeMistakeRows(
    (mistakes ?? []) as unknown as MistakeRow[],
    problemMistakeIds
  );
  const rowsWithoutSubmitters = [...problemRows, ...orphanMistakeRows].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  const submitters = await getSubmitters(rowsWithoutSubmitters);
  const rows = rowsWithoutSubmitters.map((row) => ({
    ...row,
    submitter: row.createdBy ? (submitters.get(row.createdBy) ?? null) : null
  }));
  const filteredRows = filterRows(rows, filters);
  const paginatedRows = filteredRows.slice(
    pagination.from,
    pagination.from + pagination.pageSize
  );
  const stats = buildStats(rows);
  const questionTypeOptions = (questionTypes ?? []) as QuestionTypeRow[];
  const pageError = problemsError?.message ?? mistakesError?.message;
  const totalCount =
    filters.keyword ||
    filters.level1 ||
    filters.level2 ||
    filters.level3 ||
    filters.questionTypeId ||
    filters.status ||
    filters.sourceType
      ? filteredRows.length
      : (problemsCount ?? 0) + (mistakesCount ?? 0);

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-8">
      <div>
        <p className="text-sm font-medium text-clay">教师端</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">
          答案解析中心
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">
          统一维护教师题库和学生已确认错题的答案解析。答案与解析以原始 LaTeX/Markdown 源码保存，学生端只负责查看。
        </p>
      </div>

      {params?.message ? (
        <p className="mt-6 rounded-md border border-moss/20 bg-white px-4 py-3 text-sm text-moss">
          {params.message}
        </p>
      ) : null}

      {pageError ? (
        <p className="mt-6 rounded-md border border-clay/30 bg-clay/10 px-4 py-3 text-sm text-clay">
          {pageError}
        </p>
      ) : null}

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="待补答案" value={stats.pendingAnswer} />
        <StatCard label="待补解析" value={stats.pendingAnalysis} />
        <StatCard label="已完成" value={stats.completed} />
        <StatCard label="教师录入题目数" value={stats.teacherCreated} />
        <StatCard label="学生提交题目数" value={stats.studentSubmitted} />
      </section>

      <section className="mt-8 rounded-md border border-ink/10 bg-white p-5 shadow-sm">
        <form className="grid gap-4 xl:grid-cols-6">
          <input type="hidden" name="page" value="1" />
          <TextField
            name="keyword"
            label="关键词搜索"
            value={filters.keyword}
            placeholder="搜索题目 / 答案 / 解析 / raw_latex"
            className="xl:col-span-2"
          />
          <CascadingQuestionTypeFilters
            questionTypes={questionTypeOptions}
            selectedLevel1={filters.level1}
            selectedLevel2={filters.level2}
            selectedLevel3={filters.level3}
            selectedQuestionTypeId={filters.questionTypeId}
            hiddenQuestionTypeIdName="questionTypeId"
            className="contents"
          />
          <SelectField
            name="status"
            label="状态筛选"
            value={filters.status}
            options={[
              ["", "全部"],
              ["missing_answer", "待补答案"],
              ["missing_analysis", "待补解析"],
              ["completed", "已完成"]
            ]}
          />
          <SelectField
            name="sourceType"
            label="来源筛选"
            value={filters.sourceType}
            options={[
              ["", "全部"],
              ["teacher_created", "教师录入"],
              ["student_submitted", "学生提交"]
            ]}
          />
          <div className="flex items-end gap-3 xl:col-span-2">
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-moss px-4 text-sm font-medium text-white"
            >
              <Search className="h-4 w-4" />
              筛选
            </button>
            <Link
              href="/teacher/solutions"
              className="inline-flex h-10 items-center rounded-md px-4 text-sm font-medium text-ink/65 hover:text-ink"
            >
              清空
            </Link>
          </div>
        </form>
      </section>

      <section className="mt-8">
        {paginatedRows.length === 0 ? (
          <div className="rounded-md border border-dashed border-ink/20 bg-white px-5 py-10 text-center text-sm text-ink/60">
            暂无符合条件的题目。
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedRows.map((row) => (
              <article
                key={`${row.solutionType}:${row.id}`}
                className="rounded-md border border-ink/10 bg-white p-5 shadow-sm"
              >
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge text={getSourceTypeLabel(row.sourceType)} />
                      <Badge text={getProblemTypeLabel(row.problemType)} />
                      <Badge
                        text={row.isInProblemLibrary ? "已加入题库" : "未加入题库"}
                      />
                      <Badge text={hasContent(row.answer) ? "答案已填" : "待补答案"} />
                      <Badge
                        text={hasContent(row.analysis) ? "解析已填" : "待补解析"}
                      />
                    </div>
                    <div className="mt-3 rounded-md bg-paper p-4">
                      <LatexProblemRenderer rawLatex={row.rawLatex} />
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-ink/55">
                      {row.questionType
                        ? `${row.questionType.level1} / ${row.questionType.level2}`
                        : "未指定题型"}
                    </p>
                    <h2 className="mt-1 text-base font-semibold text-ink">
                      {row.questionType?.level3 ?? "题目"}
                    </h2>
                    <p className="mt-3 text-sm text-ink/60">
                      提交人：{getSubmitterLabel(row.submitter, row.createdBy)}
                    </p>
                    <p className="mt-1 text-sm text-ink/60">
                      更新时间：{formatDateTime(row.updatedAt)}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href={`/teacher/solutions/${row.routeId}`}
                        className="inline-flex h-9 items-center gap-2 rounded-md bg-moss px-3 text-sm font-medium text-white"
                      >
                        <FilePenLine className="h-4 w-4" />
                        编辑答案解析
                      </Link>
                      {row.solutionType === "mistake" ? (
                        <form action={addMistakeToProblemLibrary}>
                          <input type="hidden" name="mistakeId" value={row.id} />
                          <button
                            type="submit"
                            className="inline-flex h-9 items-center gap-2 rounded-md border border-moss/20 bg-moss/10 px-3 text-sm font-medium text-moss"
                          >
                            <LibraryBig className="h-4 w-4" />
                            加入教师题库
                          </button>
                        </form>
                      ) : null}
                      <CopyLatexButton
                        rawLatex={row.rawLatex}
                        label="复制题目 LaTeX"
                      />
                      <CopyLatexButton
                        rawLatex={row.answer}
                        label="复制答案 LaTeX"
                      />
                      <CopyLatexButton
                        rawLatex={row.analysis}
                        label="复制解析 LaTeX"
                      />
                      <details>
                        <summary className="inline-flex h-9 cursor-pointer items-center rounded-md border border-ink/15 bg-white px-3 text-sm font-medium text-ink">
                          查看源码
                        </summary>
                        <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-paper p-3 font-mono text-xs leading-5 text-ink/70">
                          {buildSourcePreview(row)}
                        </pre>
                      </details>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        <Pagination
          basePath="/teacher/solutions"
          searchParams={filters}
          page={pagination.page}
          pageSize={pagination.pageSize}
          totalCount={totalCount}
        />
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-ink/10 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-ink/60">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function SelectField({
  name,
  label,
  value,
  options
}: {
  name: string;
  label: string;
  value: string;
  options: [string, string][];
}) {
  return (
    <label className="block text-sm font-medium text-ink">
      {label}
      <select
        name={name}
        defaultValue={value}
        className="mt-2 h-10 w-full rounded-md border border-ink/15 bg-white px-3 text-sm outline-none focus:border-moss"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue || "all"} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextField({
  name,
  label,
  value,
  placeholder,
  className
}: {
  name: string;
  label: string;
  value: string;
  placeholder: string;
  className?: string;
}) {
  return (
    <label className={`block text-sm font-medium text-ink ${className ?? ""}`}>
      {label}
      <input
        name={name}
        defaultValue={value}
        placeholder={placeholder}
        className="mt-2 h-10 w-full rounded-md border border-ink/15 px-3 text-sm outline-none focus:border-moss"
      />
    </label>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <span className="rounded-md bg-paper px-2 py-1 text-xs text-ink/65">
      {text}
    </span>
  );
}

async function getSubmitters(rows: SolutionRow[]) {
  const ids = unique(rows.map((row) => row.createdBy).filter(Boolean));
  const submitters = new Map<string, ProfileRow>();

  if (ids.length === 0) {
    return submitters;
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .in("id", ids);

  for (const profile of (data ?? []) as ProfileRow[]) {
    submitters.set(profile.id, profile);
  }

  return submitters;
}

function normalizeProblemRows(rows: ProblemRow[]): SolutionRow[] {
  return rows.map((row) => ({
    id: row.id,
    routeId: row.id,
    solutionType: "problem",
    createdBy: row.created_by,
    questionTypeId: row.question_type_id,
    problemType: row.problem_type,
    rawLatex: row.raw_latex,
    normalizedText: row.normalized_text,
    answer: row.answer,
    analysis: row.analysis,
    source: row.source,
    sourceType: row.source_type,
    sourceMistakeId: row.source_mistake_id,
    isInProblemLibrary: true,
    updatedAt: row.updated_at,
    questionType: normalizeQuestionType(row.question_types),
    submitter: null
  }));
}

function normalizeMistakeRows(
  rows: MistakeRow[],
  problemMistakeIds: Set<string>
): SolutionRow[] {
  return rows
    .filter((row) => !problemMistakeIds.has(row.id))
    .map((row) => ({
      id: row.id,
      routeId: `mistake_${row.id}`,
      solutionType: "mistake",
      createdBy: row.user_id,
      questionTypeId: row.question_type_id,
      problemType: row.problem_type,
      rawLatex: row.raw_latex || row.latex_content || row.stem,
      normalizedText: row.normalized_stem,
      answer: row.answer,
      analysis: row.analysis,
      source: row.source,
      sourceType: "student_submitted",
      sourceMistakeId: row.id,
      isInProblemLibrary: false,
      updatedAt: row.updated_at,
      questionType: normalizeQuestionType(row.question_types),
      submitter: null
    }));
}

function filterRows(
  rows: SolutionRow[],
  filters: {
    level1: string;
    level2: string;
    level3: string;
    questionTypeId: string;
    status: string;
    sourceType: string;
    keyword: string;
  }
) {
  const keyword = filters.keyword.trim().toLowerCase();

  return rows.filter((row) => {
    if (filters.questionTypeId && row.questionTypeId !== filters.questionTypeId) {
      return false;
    }

    if (filters.level1 && row.questionType?.level1 !== filters.level1) {
      return false;
    }

    if (filters.level2 && row.questionType?.level2 !== filters.level2) {
      return false;
    }

    if (filters.level3 && row.questionType?.level3 !== filters.level3) {
      return false;
    }

    if (filters.sourceType && row.sourceType !== filters.sourceType) {
      return false;
    }

    if (filters.status === "missing_answer" && hasContent(row.answer)) {
      return false;
    }

    if (filters.status === "missing_analysis" && hasContent(row.analysis)) {
      return false;
    }

    if (
      filters.status === "completed" &&
      (!hasContent(row.answer) || !hasContent(row.analysis))
    ) {
      return false;
    }

    if (keyword) {
      const searchable = `${row.rawLatex} ${row.normalizedText ?? ""} ${
        row.answer ?? ""
      } ${row.analysis ?? ""} ${row.source ?? ""}`.toLowerCase();

      if (!searchable.includes(keyword)) {
        return false;
      }
    }

    return true;
  });
}

function buildStats(rows: SolutionRow[]) {
  return {
    pendingAnswer: rows.filter((row) => !hasContent(row.answer)).length,
    pendingAnalysis: rows.filter((row) => !hasContent(row.analysis)).length,
    completed: rows.filter(
      (row) => hasContent(row.answer) && hasContent(row.analysis)
    ).length,
    teacherCreated: rows.filter((row) => row.sourceType === "teacher_created")
      .length,
    studentSubmitted: rows.filter(
      (row) => row.sourceType === "student_submitted"
    ).length
  };
}

function buildSourcePreview(row: SolutionRow) {
  return [
    "raw_latex:",
    row.rawLatex,
    "",
    "answer:",
    row.answer ?? "",
    "",
    "analysis:",
    row.analysis ?? ""
  ].join("\n");
}

function normalizeQuestionType(
  value: QuestionTypeRow | QuestionTypeRow[] | null
) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function hasContent(value: string | null) {
  return Boolean(value?.trim());
}

function unique<T>(values: (T | null)[]) {
  return Array.from(new Set(values.filter((value): value is T => Boolean(value))));
}

function getSubmitterLabel(profile: ProfileRow | null, userId: string | null) {
  if (profile?.full_name) {
    return profile.full_name;
  }

  if (profile?.email) {
    return profile.email;
  }

  return userId ? `${userId.slice(0, 8)}...` : "未知";
}

function getSourceTypeLabel(value: SolutionRow["sourceType"]) {
  return value === "student_submitted" ? "学生提交" : "教师录入";
}

function getProblemTypeLabel(value: SolutionRow["problemType"]) {
  if (value === "single_choice") {
    return "单选题";
  }

  if (value === "fill_blank") {
    return "填空题";
  }

  return "计算题";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
