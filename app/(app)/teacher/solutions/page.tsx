import Link from "next/link";
import { FilePenLine, LibraryBig, Search } from "lucide-react";
import { Pagination } from "@/components/pagination";
import { LatexContentRenderer } from "@/components/problems/LatexContentRenderer";
import { LatexProblemRenderer } from "@/components/problems/LatexProblemRenderer";
import { CascadingQuestionTypeFilters } from "@/components/question-types/CascadingQuestionTypeFilters";
import { SubmitButton } from "@/components/submit-button";
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

type SolutionSource = "problems" | "mistakes";

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

type ProblemLibraryRow = Pick<
  Database["public"]["Tables"]["problems"]["Row"],
  "id" | "source_mistake_id" | "answer" | "analysis"
>;

type MistakeRow = Pick<
  Database["public"]["Tables"]["mistakes"]["Row"],
  | "id"
  | "user_id"
  | "question_type_id"
  | "problem_type"
  | "stem"
  | "raw_text"
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
    source?: string;
    level1?: string;
    level2?: string;
    level3?: string;
    questionTypeId?: string;
    status?: string;
    sourceType?: string;
    keyword?: string;
    submitter?: string;
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
    source: getSolutionSource(params?.source),
    level1: params?.level1 ?? "",
    level2: params?.level2 ?? "",
    level3: params?.level3 ?? "",
    questionTypeId: params?.questionTypeId ?? "",
    status: params?.status ?? "",
    sourceType: params?.sourceType ?? "",
    keyword: params?.keyword ?? "",
    submitter: params?.submitter ?? "",
    page: params?.page,
    pageSize: params?.pageSize
  };
  const pagination = getPaginationState(params);
  const admin = createAdminClient();

  const { data: questionTypes } = await admin
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

  const pageResult =
    filters.source === "mistakes"
      ? await getMistakeSolutionPage({
          admin,
          filters,
          questionTypeIds: matchingQuestionTypeIds,
          from: pagination.from,
          to: pagination.to
        })
      : await getProblemSolutionPage({
          admin,
          filters,
          questionTypeIds: matchingQuestionTypeIds,
          from: pagination.from,
          to: pagination.to
        });
  const stats = buildPageStats(pageResult.rows, pageResult.totalCount);

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-8">
      <div>
        <p className="text-sm font-medium text-clay">教师端</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">
          答案解析中心
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">
          按来源拆分为教师题库和学生提交两个列表，各自独立服务端分页，避免合并全量数据后再分页。
        </p>
      </div>

      {params?.message ? (
        <p className="mt-6 rounded-md border border-moss/20 bg-white px-4 py-3 text-sm text-moss">
          {params.message}
        </p>
      ) : null}

      {pageResult.error ? (
        <p className="mt-6 rounded-md border border-clay/30 bg-clay/10 px-4 py-3 text-sm text-clay">
          {pageResult.error}
        </p>
      ) : null}

      <SolutionTabs filters={filters} />

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="当前筛选结果" value={stats.totalCount} />
        <StatCard label="本页待补答案" value={stats.pendingAnswer} />
        <StatCard label="本页待补解析" value={stats.pendingAnalysis} />
        <StatCard label="本页已完成" value={stats.completed} />
      </section>

      <section className="mt-8 rounded-md border border-ink/10 bg-white p-5 shadow-sm">
        <form className="grid gap-4 xl:grid-cols-6">
          <input type="hidden" name="source" value={filters.source} />
          <input type="hidden" name="page" value="1" />
          <TextField
            name="keyword"
            label="关键词搜索"
            value={filters.keyword}
            placeholder={
              filters.source === "mistakes"
                ? "搜索题目 / 答案 / 解析"
                : "搜索 raw_latex / answer / analysis"
            }
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
            label="答案状态"
            value={filters.status}
            options={[
              ["", "全部"],
              ["missing_answer", "待补答案"],
              ["missing_analysis", "待补解析"],
              ["completed", "已完成"]
            ]}
          />
          {filters.source === "problems" ? (
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
          ) : (
            <TextField
              name="submitter"
              label="提交人搜索"
              value={filters.submitter}
              placeholder="姓名 / 邮箱 / user_id"
            />
          )}
          <div className="flex items-end gap-3 xl:col-span-2">
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-moss px-4 text-sm font-medium text-white"
            >
              <Search className="h-4 w-4" />
              筛选
            </button>
            <Link
              href={`/teacher/solutions?source=${filters.source}`}
              className="inline-flex h-10 items-center rounded-md px-4 text-sm font-medium text-ink/65 hover:text-ink"
            >
              清空
            </Link>
          </div>
        </form>
      </section>

      <section className="mt-8">
        {pageResult.rows.length === 0 ? (
          <div className="rounded-md border border-dashed border-ink/20 bg-white px-5 py-10 text-center text-sm text-ink/60">
            暂无符合条件的题目。
          </div>
        ) : (
          <div className="space-y-4">
            {pageResult.rows.map((row) => (
              <SolutionCard key={`${row.solutionType}:${row.id}`} row={row} />
            ))}
          </div>
        )}
        <Pagination
          basePath="/teacher/solutions"
          searchParams={filters}
          page={pagination.page}
          pageSize={pagination.pageSize}
          totalCount={pageResult.totalCount}
        />
      </section>
    </main>
  );
}

function SolutionTabs({
  filters
}: {
  filters: {
    source: SolutionSource;
    level1: string;
    level2: string;
    level3: string;
    questionTypeId: string;
    status: string;
    sourceType: string;
    keyword: string;
    submitter: string;
    page?: string;
    pageSize?: string;
  };
}) {
  return (
    <nav className="mt-8 flex flex-wrap gap-2 rounded-md border border-ink/10 bg-white p-2 shadow-sm">
      <TabLink
        href={buildTabHref("problems", filters)}
        active={filters.source === "problems"}
      >
        教师题库
      </TabLink>
      <TabLink
        href={buildTabHref("mistakes", filters)}
        active={filters.source === "mistakes"}
      >
        学生提交
      </TabLink>
    </nav>
  );
}

function TabLink({
  href,
  active,
  children
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex h-10 items-center rounded-md px-4 text-sm font-medium",
        active ? "bg-moss text-white" : "text-ink/65 hover:bg-paper hover:text-ink"
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

function SolutionCard({ row }: { row: SolutionRow }) {
  return (
    <article className="rounded-md border border-ink/10 bg-white p-5 shadow-sm">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge text={getSourceTypeLabel(row.sourceType)} />
            <Badge text={getProblemTypeLabel(row.problemType)} />
            <Badge text={row.isInProblemLibrary ? "已加入题库" : "未加入题库"} />
            <Badge text={hasContent(row.answer) ? "答案已填" : "待补答案"} />
            <Badge text={hasContent(row.analysis) ? "解析已填" : "待补解析"} />
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
            {row.solutionType === "mistake" && !row.isInProblemLibrary ? (
              <form action={addMistakeToProblemLibrary}>
                <input type="hidden" name="mistakeId" value={row.id} />
                <SubmitButton
                  pendingText="加入中..."
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-moss/20 bg-moss/10 px-3 text-sm font-medium text-moss"
                >
                  <LibraryBig className="h-4 w-4" />
                  加入教师题库
                </SubmitButton>
              </form>
            ) : null}
            <CopyLatexButton rawLatex={row.rawLatex} label="复制题目 LaTeX" />
            <CopyLatexButton rawLatex={row.answer} label="复制答案 LaTeX" />
            <CopyLatexButton rawLatex={row.analysis} label="复制解析 LaTeX" />
            <details>
              <summary className="inline-flex h-9 cursor-pointer items-center rounded-md border border-ink/15 bg-white px-3 text-sm font-medium text-ink">
                查看答案
              </summary>
              <div className="mt-3 grid gap-3 rounded-md bg-paper p-3 text-sm md:grid-cols-2">
                <section>
                  <h3 className="font-medium text-ink">答案</h3>
                  <div className="mt-2">
                    <LatexContentRenderer content={row.answer} fallback="暂无答案" />
                  </div>
                </section>
                <section>
                  <h3 className="font-medium text-ink">解析</h3>
                  <div className="mt-2">
                    <LatexContentRenderer
                      content={row.analysis}
                      fallback="暂无解析"
                    />
                  </div>
                </section>
              </div>
            </details>
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

async function getProblemSolutionPage({
  admin,
  filters,
  questionTypeIds,
  from,
  to
}: {
  admin: ReturnType<typeof createAdminClient>;
  filters: {
    status: string;
    sourceType: string;
    keyword: string;
  };
  questionTypeIds: string[] | null;
  from: number;
  to: number;
}) {
  if (questionTypeIds && questionTypeIds.length === 0) {
    return emptyPageResult();
  }

  let query = admin
    .from("problems")
    .select(
      "id, created_by, question_type_id, problem_type, raw_latex, normalized_text, answer, analysis, source, source_type, source_mistake_id, updated_at, question_types(id, level1, level2, level3)",
      { count: "exact" }
    )
    .order("updated_at", { ascending: false });

  if (questionTypeIds) {
    query = query.in("question_type_id", questionTypeIds);
  }

  if (filters.sourceType) {
    query = query.eq("source_type", filters.sourceType);
  }

  if (filters.status === "missing_answer") {
    query = query.or("answer.is.null,answer.eq.");
  }

  if (filters.status === "missing_analysis") {
    query = query.or("analysis.is.null,analysis.eq.");
  }

  if (filters.status === "completed") {
    query = query
      .filter("answer", "not.is", null)
      .filter("analysis", "not.is", null);
  }

  const keyword = sanitizeSearchValue(filters.keyword);
  if (keyword) {
    query = query.or(
      `raw_latex.ilike.%${keyword}%,answer.ilike.%${keyword}%,analysis.ilike.%${keyword}%`
    );
  }

  const { data, error, count } = await query.range(from, to);
  const rows = normalizeProblemRows((data ?? []) as unknown as ProblemRow[]);
  const submitters = await getSubmitters(rows);

  return {
    rows: rows.map((row) => ({
      ...row,
      submitter: row.createdBy ? (submitters.get(row.createdBy) ?? null) : null
    })),
    totalCount: count ?? 0,
    error: error?.message ?? null
  };
}

async function getMistakeSolutionPage({
  admin,
  filters,
  questionTypeIds,
  from,
  to
}: {
  admin: ReturnType<typeof createAdminClient>;
  filters: {
    status: string;
    keyword: string;
    submitter: string;
  };
  questionTypeIds: string[] | null;
  from: number;
  to: number;
}) {
  if (questionTypeIds && questionTypeIds.length === 0) {
    return emptyPageResult();
  }

  const submitterIds = await getSubmitterIdsForSearch(admin, filters.submitter);
  if (submitterIds && submitterIds.length === 0) {
    return emptyPageResult();
  }

  let query = admin
    .from("mistakes")
    .select(
      "id, user_id, question_type_id, problem_type, stem, raw_text, raw_latex, latex_content, normalized_stem, answer, analysis, source, updated_at, question_types(id, level1, level2, level3)",
      { count: "exact" }
    )
    .eq("classification_status", "teacher_confirmed")
    .not("question_type_id", "is", null)
    .order("updated_at", { ascending: false });

  if (questionTypeIds) {
    query = query.in("question_type_id", questionTypeIds);
  }

  if (submitterIds) {
    query = query.in("user_id", submitterIds);
  }

  if (filters.status === "missing_answer") {
    query = query.or("answer.is.null,answer.eq.");
  }

  if (filters.status === "missing_analysis") {
    query = query.or("analysis.is.null,analysis.eq.");
  }

  if (filters.status === "completed") {
    query = query
      .filter("answer", "not.is", null)
      .filter("analysis", "not.is", null);
  }

  const keyword = sanitizeSearchValue(filters.keyword);
  if (keyword) {
    query = query.or(
      `raw_latex.ilike.%${keyword}%,latex_content.ilike.%${keyword}%,raw_text.ilike.%${keyword}%,stem.ilike.%${keyword}%,answer.ilike.%${keyword}%,analysis.ilike.%${keyword}%`
    );
  }

  const { data, error, count } = await query.range(from, to);
  const mistakeRows = (data ?? []) as unknown as MistakeRow[];
  const [submitters, problemMap] = await Promise.all([
    getSubmitters(
      mistakeRows.map((row) => ({
        createdBy: row.user_id
      }))
    ),
    getProblemMapForMistakes(
      admin,
      mistakeRows.map((row) => row.id)
    )
  ]);

  return {
    rows: normalizeMistakeRows(mistakeRows, problemMap).map((row) => ({
      ...row,
      submitter: row.createdBy ? (submitters.get(row.createdBy) ?? null) : null
    })),
    totalCount: count ?? 0,
    error: error?.message ?? null
  };
}

async function getSubmitterIdsForSearch(
  admin: ReturnType<typeof createAdminClient>,
  value: string
) {
  const search = sanitizeSearchValue(value);

  if (!search) {
    return null;
  }

  const ids = new Set<string>();
  if (isUuid(search)) {
    ids.add(search);
  }

  const { data } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
    .limit(50);

  for (const profile of (data ?? []) as ProfileRow[]) {
    ids.add(profile.id);
  }

  return Array.from(ids);
}

async function getProblemMapForMistakes(
  admin: ReturnType<typeof createAdminClient>,
  mistakeIds: string[]
) {
  if (mistakeIds.length === 0) {
    return new Map<string, ProblemLibraryRow>();
  }

  const { data } = await admin
    .from("problems")
    .select("id, source_mistake_id, answer, analysis")
    .in("source_mistake_id", mistakeIds);

  return new Map(
    ((data ?? []) as ProblemLibraryRow[])
      .filter((row) => Boolean(row.source_mistake_id))
      .map((row) => [row.source_mistake_id as string, row])
  );
}

async function getSubmitters(rows: Array<{ createdBy: string | null }>) {
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
  problemMap: Map<string, ProblemLibraryRow>
): SolutionRow[] {
  return rows.map((row) => {
    const problem = problemMap.get(row.id);

    return {
      id: row.id,
      routeId: problem ? problem.id : `mistake_${row.id}`,
      solutionType: "mistake",
      createdBy: row.user_id,
      questionTypeId: row.question_type_id,
      problemType: row.problem_type,
      rawLatex: row.raw_latex || row.latex_content || row.raw_text || row.stem,
      normalizedText: row.normalized_stem,
      answer: problem?.answer ?? row.answer,
      analysis: problem?.analysis ?? row.analysis,
      source: row.source,
      sourceType: "student_submitted",
      sourceMistakeId: row.id,
      isInProblemLibrary: Boolean(problem),
      updatedAt: row.updated_at,
      questionType: normalizeQuestionType(row.question_types),
      submitter: null
    };
  });
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

function buildPageStats(rows: SolutionRow[], totalCount: number) {
  return {
    totalCount,
    pendingAnswer: rows.filter((row) => !hasContent(row.answer)).length,
    pendingAnalysis: rows.filter((row) => !hasContent(row.analysis)).length,
    completed: rows.filter(
      (row) => hasContent(row.answer) && hasContent(row.analysis)
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

function buildTabHref(source: SolutionSource, filters: { [key: string]: string | undefined }) {
  const params = new URLSearchParams();
  params.set("source", source);
  params.set("page", "1");

  for (const key of [
    "level1",
    "level2",
    "level3",
    "questionTypeId",
    "status",
    "keyword",
    "pageSize"
  ]) {
    const value = filters[key];
    if (value) {
      params.set(key, value);
    }
  }

  if (source === "problems" && filters.sourceType) {
    params.set("sourceType", filters.sourceType);
  }

  if (source === "mistakes" && filters.submitter) {
    params.set("submitter", filters.submitter);
  }

  return `/teacher/solutions?${params.toString()}`;
}

function getSolutionSource(value: string | undefined): SolutionSource {
  return value === "mistakes" ? "mistakes" : "problems";
}

function emptyPageResult() {
  return {
    rows: [] as SolutionRow[],
    totalCount: 0,
    error: null as string | null
  };
}

function normalizeQuestionType(
  value: QuestionTypeRow | QuestionTypeRow[] | null
) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function hasContent(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function unique<T>(values: (T | null)[]) {
  return Array.from(new Set(values.filter((value): value is T => Boolean(value))));
}

function sanitizeSearchValue(value: string) {
  return value.trim().replace(/[(),]/g, " ");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
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
