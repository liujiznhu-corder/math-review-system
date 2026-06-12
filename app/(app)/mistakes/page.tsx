import Link from "next/link";
import { Eye, Plus } from "lucide-react";
import { Pagination } from "@/components/pagination";
import { LatexProblemRenderer } from "@/components/problems/LatexProblemRenderer";
import { CascadingQuestionTypeFilters } from "@/components/question-types/CascadingQuestionTypeFilters";
import { getPaginationState } from "@/lib/pagination";
import { redirectTeacherToDashboard } from "@/lib/roles";
import {
  getStudentMistakesListPage,
  type StudentMistakeListItem
} from "@/services/student/mistakes";

type MistakesPageProps = {
  searchParams?: Promise<{
    level1?: string;
    level2?: string;
    level3?: string;
    questionTypeId?: string;
    status?: string;
    keyword?: string;
    message?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function MistakesPage({ searchParams }: MistakesPageProps) {
  await redirectTeacherToDashboard();

  const params = await searchParams;
  const filters = {
    level1: params?.level1 ?? "",
    level2: params?.level2 ?? "",
    level3: params?.level3 ?? "",
    questionTypeId: params?.questionTypeId ?? "",
    status: params?.status ?? "",
    keyword: params?.keyword ?? "",
    page: params?.page,
    pageSize: params?.pageSize
  };
  const pagination = getPaginationState(params);
  const { questionTypes, mistakes, totalCount, error } =
    await getStudentMistakesListPage({
      level1: filters.level1,
      level2: filters.level2,
      level3: filters.level3,
      questionTypeId: filters.questionTypeId,
      status: filters.status,
      keyword: filters.keyword,
      from: pagination.from,
      to: pagination.to
    });

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
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
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-moss px-4 text-sm font-medium text-white sm:h-10 sm:w-auto"
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

      {error ? (
        <p className="mt-6 rounded-md border border-clay/30 bg-clay/10 px-4 py-3 text-sm text-clay">
          {error.message}
        </p>
      ) : null}

      <section className="mt-8 rounded-md border border-ink/10 bg-white p-5 shadow-sm">
        <form className="grid gap-4 lg:grid-cols-3">
          <input type="hidden" name="page" value="1" />
          <CascadingQuestionTypeFilters
            questionTypes={questionTypes}
            selectedLevel1={filters.level1}
            selectedLevel2={filters.level2}
            selectedLevel3={filters.level3}
            selectedQuestionTypeId={filters.questionTypeId}
            hiddenQuestionTypeIdName="questionTypeId"
            className="contents"
          />

          <label className="block text-sm font-medium text-ink">
            分类状态
            <select
              name="status"
              defaultValue={filters.status}
              className="mt-2 h-10 w-full rounded-md border border-ink/15 bg-white px-3 text-sm outline-none focus:border-moss"
            >
              <option value="">全部状态</option>
              <option value="pending">待教师审核</option>
              <option value="student_selected">学生已选择</option>
              <option value="teacher_confirmed">教师已确认</option>
            </select>
          </label>

          <label className="block text-sm font-medium text-ink lg:col-span-2">
            关键词搜索
            <input
              name="keyword"
              defaultValue={filters.keyword}
              placeholder="搜索题干 raw_latex / raw_text / stem"
              className="mt-2 h-10 w-full rounded-md border border-ink/15 px-3 text-sm outline-none focus:border-moss"
            />
          </label>

          <div className="flex flex-col gap-3 sm:flex-row lg:col-span-3">
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-md border border-ink/15 px-4 text-sm font-medium text-ink"
            >
              筛选
            </button>
            <Link
              href="/mistakes"
              className="inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium text-ink/65 hover:text-ink"
            >
              清空
            </Link>
          </div>
        </form>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">错题列表</h2>
          <p className="text-sm text-ink/60">共 {totalCount} 条</p>
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

                <div className="mt-4">
                  <Link
                    href={`/mistakes/${mistake.id}/answer?returnUrl=${encodeURIComponent("/mistakes")}`}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-ink/15 bg-white px-3 text-sm font-medium text-ink hover:border-moss/40 hover:text-moss sm:h-9 sm:w-auto"
                  >
                    <Eye className="h-4 w-4" />
                    查看答案
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

        <Pagination
          basePath="/mistakes"
          searchParams={filters}
          page={pagination.page}
          pageSize={pagination.pageSize}
          totalCount={totalCount}
        />
      </section>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
}

function getClassificationStatusLabel(
  status: StudentMistakeListItem["classification_status"]
) {
  if (status === "teacher_confirmed") {
    return "教师已确认";
  }

  if (status === "student_selected") {
    return "学生已选择";
  }

  return "待教师审核";
}
