import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Search } from "lucide-react";
import { Pagination } from "@/components/pagination";
import { LatexProblemRenderer } from "@/components/problems/LatexProblemRenderer";
import { CascadingQuestionTypeFilters } from "@/components/question-types/CascadingQuestionTypeFilters";
import { SubmitButton } from "@/components/submit-button";
import { getPaginationState, getTotalPages } from "@/lib/pagination";
import {
  canManageQuestionTypes,
  getCurrentUserRole,
  redirectStudentToDashboard
} from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { confirmMistakeQuestionType } from "./actions";
import type { Database } from "@/types/database";

const PAGE_SIZE = 5;
const PAGE_SIZE_OPTIONS = [PAGE_SIZE] as const;

type QuestionTypeRow = Pick<
  Database["public"]["Tables"]["question_types"]["Row"],
  "id" | "level1" | "level2" | "level3"
>;

type ProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "email" | "full_name"
>;

type PendingMistake = Pick<
  Database["public"]["Tables"]["mistakes"]["Row"],
  | "id"
  | "user_id"
  | "stem"
  | "raw_text"
  | "raw_latex"
  | "latex_content"
  | "input_type"
  | "problem_type"
  | "note"
  | "created_at"
  | "teacher_note"
>;

type ReviewMistakeItem = PendingMistake & {
  submitter: ProfileRow | null;
};

type ReviewMistakeFilters = {
  submitter: string;
  submittedAt: string;
  keyword: string;
  page?: string;
  pageSize?: string;
};

type ReviewMistakesPageProps = {
  searchParams?: Promise<{
    message?: string;
    submitter?: string;
    submittedAt?: string;
    keyword?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ReviewMistakesPage({
  searchParams
}: ReviewMistakesPageProps) {
  const params = await searchParams;
  await redirectStudentToDashboard();
  const role = await getCurrentUserRole();

  if (!canManageQuestionTypes(role)) {
    await redirectStudentToDashboard();
  }

  const filters: ReviewMistakeFilters = {
    submitter: params?.submitter ?? "",
    submittedAt: params?.submittedAt ?? "",
    keyword: params?.keyword ?? "",
    page: params?.page,
    pageSize: params?.pageSize
  };
  const pagination = getPaginationState(params, {
    defaultPageSize: PAGE_SIZE,
    pageSizeOptions: PAGE_SIZE_OPTIONS
  });

  const admin = createAdminClient();
  const [questionTypesResult, submitterIds] = await Promise.all([
    admin
      .from("question_types")
      .select("id, level1, level2, level3")
      .eq("is_active", true)
      .order("level1", { ascending: true })
      .order("level2", { ascending: true })
      .order("level3", { ascending: true }),
    getSubmitterIdsForSearch(admin, filters.submitter)
  ]);

  const availableQuestionTypes = (questionTypesResult.data ??
    []) as QuestionTypeRow[];
  const questionTypeOptions = availableQuestionTypes.map((questionType) => ({
    id: questionType.id,
    level1: questionType.level1,
    level2: questionType.level2,
    level3: questionType.level3
  }));
  const { data: mistakes, error, count } = await buildPendingMistakesQuery({
    admin,
    filters,
    submitterIds,
    from: pagination.from,
    to: pagination.to
  });
  const totalCount = count ?? 0;
  const totalPages = getTotalPages(totalCount, pagination.pageSize);

  if (pagination.page > totalPages) {
    redirect(
      buildReviewMistakesHref(filters, {
        page: totalPages,
        pageSize: pagination.pageSize
      })
    );
  }

  const pendingMistakes = (mistakes ?? []) as PendingMistake[];
  const submitters = await getSubmitters(admin, pendingMistakes);
  const reviewItems: ReviewMistakeItem[] = pendingMistakes.map((mistake) => ({
    ...mistake,
    submitter: submitters.get(mistake.user_id) ?? null
  }));
  const currentListHref = buildReviewMistakesHref(filters, {
    page: pagination.page,
    pageSize: pagination.pageSize
  });

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <p className="text-sm font-medium text-clay">教师端</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">错题审核</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">
          审核页只负责确认学生错题的最终题型。确认后继续留在本页审核下一题，答案和解析统一到答案解析中心维护。
        </p>
      </div>

      {params?.message ? (
        <p className="mt-6 rounded-md border border-moss/20 bg-white px-4 py-3 text-sm text-moss">
          {params.message}
        </p>
      ) : null}

      {questionTypesResult.error || error ? (
        <p className="mt-6 rounded-md border border-clay/30 bg-clay/10 px-4 py-3 text-sm text-clay">
          {questionTypesResult.error?.message ?? error?.message}
        </p>
      ) : null}

      <section className="mt-8 rounded-md border border-ink/10 bg-white p-5 shadow-sm">
        <form className="grid gap-4 lg:grid-cols-6">
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="pageSize" value={PAGE_SIZE} />

          <label className="block text-sm font-medium text-ink lg:col-span-2">
            提交人搜索
            <input
              name="submitter"
              defaultValue={filters.submitter}
              placeholder="搜索提交人姓名 / 邮箱 / ID"
              className="mt-2 h-10 w-full rounded-md border border-ink/15 px-3 text-sm outline-none focus:border-moss"
            />
          </label>

          <label className="block text-sm font-medium text-ink">
            提交时间
            <select
              name="submittedAt"
              defaultValue={filters.submittedAt}
              className="mt-2 h-10 w-full rounded-md border border-ink/15 bg-white px-3 text-sm outline-none focus:border-moss"
            >
              <option value="">全部</option>
              <option value="today">今天</option>
              <option value="7d">最近 7 天</option>
              <option value="30d">最近 30 天</option>
            </select>
          </label>

          <label className="block text-sm font-medium text-ink lg:col-span-3">
            关键词搜索
            <input
              name="keyword"
              defaultValue={filters.keyword}
              placeholder="搜索题干 raw_latex / raw_text / stem"
              className="mt-2 h-10 w-full rounded-md border border-ink/15 px-3 text-sm outline-none focus:border-moss"
            />
          </label>

          <div className="flex items-end gap-3 lg:col-span-3">
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-moss px-4 text-sm font-medium text-white"
            >
              <Search className="h-4 w-4" />
              筛选
            </button>
            <Link
              href="/teacher/review-mistakes"
              className="inline-flex h-10 items-center rounded-md px-4 text-sm font-medium text-ink/65 hover:text-ink"
            >
              清空筛选
            </Link>
          </div>
        </form>
      </section>

      <section className="mt-8">
        {reviewItems.length === 0 ? (
          <div className="rounded-md border border-dashed border-ink/20 bg-white px-5 py-10 text-center text-sm text-ink/60">
            暂无符合条件的待审核错题。
          </div>
        ) : (
          <div className="space-y-5">
            {reviewItems.map((mistake) => (
              <article
                key={mistake.id}
                className="rounded-md border border-ink/10 bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm text-ink/55">
                      提交人：{getSubmitterLabel(mistake.submitter, mistake.user_id)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-ink">
                        待确认题型
                      </h2>
                      <span className="rounded-full bg-clay/10 px-2.5 py-1 text-xs font-medium text-clay">
                        pending
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-ink/50 lg:text-right">
                    <p>提交时间：{formatDateTime(mistake.created_at)}</p>
                    <p className="mt-1 text-xs">学生 ID：{shortId(mistake.user_id)}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-md bg-paper p-4">
                  {getMistakeLatex(mistake) ? (
                    <LatexProblemRenderer rawLatex={getMistakeLatex(mistake)} />
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-6 text-ink/75">
                      {mistake.raw_text || mistake.stem}
                    </p>
                  )}
                </div>

                {mistake.note ? (
                  <p className="mt-3 rounded-md border border-ink/10 px-3 py-2 text-sm leading-6 text-ink/65">
                    学生备注：{mistake.note}
                  </p>
                ) : null}

                <form
                  action={confirmMistakeQuestionType}
                  className="mt-5 grid gap-4 border-t border-ink/10 pt-5"
                >
                  <input type="hidden" name="mistakeId" value={mistake.id} />
                  <input type="hidden" name="returnTo" value={currentListHref} />

                  <section className="rounded-md bg-paper p-4">
                    <p className="text-sm font-semibold text-ink">
                      教师确认题型
                    </p>
                    <p className="mt-1 text-xs leading-5 text-ink/55">
                      请选择最终三级题型。确认后会生成学生复习任务，答案解析后续到答案解析中心维护。
                    </p>
                    <CascadingQuestionTypeFilters
                      questionTypes={questionTypeOptions}
                      hiddenQuestionTypeIdName="questionTypeId"
                      className="mt-3 grid gap-3 md:grid-cols-3"
                    />
                  </section>

                  <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
                    <label className="block text-sm font-medium text-ink">
                      题目类型
                      <select
                        name="problemType"
                        defaultValue={mistake.problem_type}
                        className="mt-2 h-10 w-full rounded-md border border-ink/15 bg-white px-3 text-sm outline-none focus:border-moss"
                      >
                        <option value="single_choice">单选题</option>
                        <option value="fill_blank">填空题</option>
                        <option value="calculation">计算题</option>
                      </select>
                    </label>

                    <label className="block text-sm font-medium text-ink">
                      教师备注
                      <textarea
                        name="teacherNote"
                        rows={3}
                        defaultValue={mistake.teacher_note ?? ""}
                        placeholder="可选：写给学生的分类说明或复习提醒。"
                        className="mt-2 w-full rounded-md border border-ink/15 px-3 py-2 text-sm leading-6 outline-none focus:border-moss"
                      />
                    </label>
                  </div>

                  <label className="block text-sm font-medium text-ink">
                    规范化 raw_latex
                    <textarea
                      name="rawLatex"
                      rows={4}
                      defaultValue={
                        mistake.raw_latex ?? mistake.latex_content ?? ""
                      }
                      placeholder="可选：将学生题目整理为教师原生 LaTeX，保存后学生答案页和答案解析中心会优先使用该内容。"
                      className="mt-2 w-full rounded-md border border-ink/15 px-3 py-2 font-mono text-sm leading-6 outline-none focus:border-moss"
                    />
                  </label>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs leading-5 text-ink/55">
                      确认后留在当前审核页，继续处理下一道待审核错题。
                    </p>
                    <SubmitButton
                      pendingText="确认中..."
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-moss px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      确认题型
                    </SubmitButton>
                  </div>
                </form>
              </article>
            ))}
          </div>
        )}

        <Pagination
          basePath="/teacher/review-mistakes"
          searchParams={filters}
          page={pagination.page}
          pageSize={pagination.pageSize}
          totalCount={totalCount}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          showPageSizeSelector={false}
        />
      </section>
    </main>
  );
}

async function getSubmitterIdsForSearch(
  admin: ReturnType<typeof createAdminClient>,
  searchValue: string
) {
  const search = searchValue.trim().toLowerCase();

  if (!search) {
    return null;
  }

  const { data } = await admin.from("profiles").select("id, email, full_name");

  return ((data ?? []) as ProfileRow[])
    .filter((profile) =>
      `${profile.full_name ?? ""} ${profile.email ?? ""} ${profile.id}`
        .toLowerCase()
        .includes(search)
    )
    .map((profile) => profile.id);
}

async function buildPendingMistakesQuery({
  admin,
  filters,
  submitterIds,
  from,
  to
}: {
  admin: ReturnType<typeof createAdminClient>;
  filters: {
    submittedAt: string;
    keyword: string;
  };
  submitterIds: string[] | null;
  from: number;
  to: number;
}) {
  if (submitterIds && submitterIds.length === 0) {
    return {
      data: [],
      error: null,
      count: 0
    };
  }

  let query = admin
    .from("mistakes")
    .select(
      "id, user_id, stem, raw_text, raw_latex, latex_content, input_type, problem_type, note, created_at, teacher_note",
      { count: "exact" }
    )
    .eq("classification_status", "pending")
    .order("created_at", { ascending: true });

  if (submitterIds) {
    query = query.in("user_id", submitterIds);
  }

  const startIso = getSubmittedAtStartIso(filters.submittedAt);
  if (startIso) {
    query = query.gte("created_at", startIso);
  }

  const keyword = filters.keyword.trim();
  if (keyword) {
    query = query.or(
      `raw_latex.ilike.%${keyword}%,latex_content.ilike.%${keyword}%,raw_text.ilike.%${keyword}%,stem.ilike.%${keyword}%`
    );
  }

  return query.range(from, to);
}

async function getSubmitters(
  admin: ReturnType<typeof createAdminClient>,
  mistakes: PendingMistake[]
) {
  const userIds = unique(mistakes.map((mistake) => mistake.user_id));
  const submitters = new Map<string, ProfileRow>();

  if (userIds.length === 0) {
    return submitters;
  }

  const { data } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .in("id", userIds);

  for (const profile of (data ?? []) as ProfileRow[]) {
    submitters.set(profile.id, profile);
  }

  return submitters;
}

function getMistakeLatex(mistake: PendingMistake) {
  const value = mistake.raw_latex ?? mistake.latex_content;

  return value?.trim() ? value : null;
}

function getSubmitterLabel(profile: ProfileRow | null, userId: string) {
  if (profile?.full_name) {
    return profile.full_name;
  }

  if (profile?.email) {
    return profile.email;
  }

  return userId;
}

function shortId(value: string) {
  return `${value.slice(0, 8)}...`;
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

function getSubmittedAtStartIso(submittedAt: string) {
  if (!submittedAt) {
    return null;
  }

  const todayKey = getChinaDateKey(new Date());
  const startKey =
    submittedAt === "today"
      ? todayKey
      : submittedAt === "7d"
        ? addDaysToDateKey(todayKey, -6)
        : submittedAt === "30d"
          ? addDaysToDateKey(todayKey, -29)
          : "";

  return startKey ? startOfDateIso(startKey) : null;
}

function getChinaDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function addDaysToDateKey(dateKey: string, offset: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + offset);

  return date.toISOString().slice(0, 10);
}

function startOfDateIso(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day)).toISOString();
}

function buildReviewMistakesHref(
  filters: {
    submitter: string;
    submittedAt: string;
    keyword: string;
  },
  options: {
    page: number;
    pageSize: number;
  }
) {
  const params = new URLSearchParams();

  if (filters.submitter) {
    params.set("submitter", filters.submitter);
  }

  if (filters.submittedAt) {
    params.set("submittedAt", filters.submittedAt);
  }

  if (filters.keyword) {
    params.set("keyword", filters.keyword);
  }

  params.set("page", String(options.page));
  params.set("pageSize", String(options.pageSize));

  return `/teacher/review-mistakes?${params.toString()}`;
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values.filter(Boolean)));
}
