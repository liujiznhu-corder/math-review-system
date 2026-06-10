import Link from "next/link";
import { CheckCircle2, Search } from "lucide-react";
import { Pagination } from "@/components/pagination";
import { LatexProblemRenderer } from "@/components/problems/LatexProblemRenderer";
import { CascadingQuestionTypeFilters } from "@/components/question-types/CascadingQuestionTypeFilters";
import { SubmitButton } from "@/components/submit-button";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  canManageQuestionTypes,
  getCurrentUserRole,
  redirectStudentToDashboard
} from "@/lib/roles";
import { getPaginationState } from "@/lib/pagination";
import {
  classifyQuestion,
  type ClassifierQuestionType
} from "@/services/classifier";
import { getClassificationText } from "@/services/latex";
import { normalizeLatexProblem } from "@/services/latex-normalizer";
import { confirmMistakeQuestionType } from "./actions";
import type { Database } from "@/types/database";

type QuestionTypeRow = Pick<
  Database["public"]["Tables"]["question_types"]["Row"],
  "id" | "level1" | "level2" | "level3" | "keywords"
> & {
  question_type_examples: {
    id: string;
    example_text: string;
  }[];
};

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

type Recommendation = {
  id: string;
  level1: string;
  level2: string;
  level3: string;
  score: number;
  reasons: string[];
};

type ReviewMistakeItem = PendingMistake & {
  submitter: ProfileRow | null;
  recommendations: Recommendation[];
};

type ReviewMistakesPageProps = {
  searchParams?: Promise<{
    message?: string;
    submitter?: string;
    submittedAt?: string;
    level1?: string;
    level2?: string;
    level3?: string;
    questionTypeId?: string;
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

  const filters = {
    submitter: params?.submitter ?? "",
    submittedAt: params?.submittedAt ?? "",
    level1: params?.level1 ?? "",
    level2: params?.level2 ?? "",
    level3: params?.level3 ?? "",
    questionTypeId: params?.questionTypeId ?? "",
    keyword: params?.keyword ?? "",
    page: params?.page,
    pageSize: params?.pageSize
  };
  const pagination = getPaginationState(params);

  const admin = createAdminClient();
  const { data: questionTypes } = await admin
    .from("question_types")
    .select(
      "id, level1, level2, level3, keywords, question_type_examples(id, example_text)"
    )
    .eq("is_active", true)
    .order("level1", { ascending: true })
    .order("level2", { ascending: true })
    .order("level3", { ascending: true });

  const availableQuestionTypes = (questionTypes ?? []) as QuestionTypeRow[];
  const questionTypeOptions = availableQuestionTypes.map((questionType) => ({
    id: questionType.id,
    level1: questionType.level1,
    level2: questionType.level2,
    level3: questionType.level3
  }));
  const classifierQuestionTypes = availableQuestionTypes.map(
    (questionType): ClassifierQuestionType => ({
      id: questionType.id,
      level1: questionType.level1,
      level2: questionType.level2,
      level3: questionType.level3,
      keywords: questionType.keywords ?? [],
      examples: questionType.question_type_examples.map((example) => ({
        id: example.id,
        questionTypeId: questionType.id,
        exampleText: example.example_text
      }))
    })
  );
  const questionTypeMap = new Map(
    availableQuestionTypes.map((questionType) => [questionType.id, questionType])
  );
  const submitterIds = await getSubmitterIdsForSearch(filters.submitter);
  const { data: mistakes, error, count } = await buildPendingMistakesQuery({
    admin,
    filters,
    submitterIds,
    from: pagination.from,
    to: pagination.to
  });
  const pendingMistakes = (mistakes ?? []) as PendingMistake[];
  const submitters = await getSubmitters(pendingMistakes);
  const reviewItems = pendingMistakes.map((mistake) => ({
    ...mistake,
    submitter: submitters.get(mistake.user_id) ?? null,
    recommendations: getRecommendations(
      mistake,
      classifierQuestionTypes,
      questionTypeMap
    )
  }));
  const filteredItems = filterReviewItems(reviewItems, filters);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8">
      <div>
        <p className="text-sm font-medium text-clay">教师端</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">错题审核</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">
          审核页只负责确认学生错题的最终题型。需要沉淀到教师题库时，请到答案解析中心手动加入。
        </p>
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
          <input type="hidden" name="page" value="1" />
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
              <option value="7d">最近7天</option>
              <option value="30d">最近30天</option>
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

          <CascadingQuestionTypeFilters
            questionTypes={questionTypeOptions}
            selectedLevel1={filters.level1}
            selectedLevel2={filters.level2}
            selectedLevel3={filters.level3}
            selectedQuestionTypeId={filters.questionTypeId}
            hiddenQuestionTypeIdName="questionTypeId"
            className="contents"
          />

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
        {filteredItems.length === 0 ? (
          <div className="rounded-md border border-dashed border-ink/20 bg-white px-5 py-10 text-center text-sm text-ink/60">
            暂无符合条件的待审核错题。
          </div>
        ) : (
          <div className="space-y-5">
            {filteredItems.map((mistake) => (
              <article
                key={mistake.id}
                className="rounded-md border border-ink/10 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm text-ink/55">
                      提交人：{getSubmitterLabel(mistake.submitter, mistake.user_id)}
                    </p>
                    <h2 className="mt-1 text-base font-semibold text-ink">
                      待确认题型
                    </h2>
                  </div>
                  <div className="text-sm text-ink/55 lg:text-right">
                    <p>提交时间：{formatDateTime(mistake.created_at)}</p>
                    <p className="mt-1">学生 ID：{shortId(mistake.user_id)}</p>
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

                {mistake.note ? (
                  <p className="mt-3 rounded-md border border-ink/10 px-3 py-2 text-sm leading-6 text-ink/65">
                    学生备注：{mistake.note}
                  </p>
                ) : null}

                <div className="mt-4">
                  <p className="text-sm font-medium text-ink">系统推荐 top 3</p>
                  <div className="mt-2 grid gap-2 lg:grid-cols-3">
                    {mistake.recommendations.map((recommendation) => (
                      <div
                        key={recommendation.id}
                        className="rounded-md border border-ink/10 bg-paper p-3"
                      >
                        <p className="text-sm font-semibold text-ink">
                          {recommendation.level3}
                        </p>
                        <p className="mt-1 text-xs text-ink/55">
                          {recommendation.level1} / {recommendation.level2}
                        </p>
                        <p className="mt-2 text-xs text-ink/70">
                          分数：{recommendation.score}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(recommendation.reasons.length > 0
                            ? recommendation.reasons
                            : ["暂无明显匹配理由"]
                          ).map((reason) => (
                            <span
                              key={reason}
                              className="rounded bg-white px-2 py-1 text-xs text-ink/60"
                            >
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <form
                  action={confirmMistakeQuestionType}
                  className="mt-5 grid gap-4"
                >
                  <input type="hidden" name="mistakeId" value={mistake.id} />
                  <label className="block text-sm font-medium text-ink">
                    教师确认题型
                    <select
                      name="questionTypeId"
                      required
                      className="mt-2 h-10 w-full rounded-md border border-ink/15 bg-white px-3 text-sm outline-none focus:border-moss"
                    >
                      <option value="">选择已有题型</option>
                      {availableQuestionTypes.map((questionType) => (
                        <option key={questionType.id} value={questionType.id}>
                          {questionType.level1} / {questionType.level2} /{" "}
                          {questionType.level3}
                        </option>
                      ))}
                    </select>
                  </label>

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
                    规范化 raw_latex
                    <textarea
                      name="rawLatex"
                      rows={5}
                      defaultValue={
                        mistake.raw_latex ?? mistake.latex_content ?? ""
                      }
                      placeholder="可选：将学生题目整理为教师原生 LaTeX，保存后学生答案页和答案解析中心会优先使用该内容。"
                      className="mt-2 w-full rounded-md border border-ink/15 px-3 py-2 font-mono text-sm leading-6 outline-none focus:border-moss"
                    />
                  </label>

                  <label className="block text-sm font-medium text-ink">
                    教师备注
                    <textarea
                      name="teacherNote"
                      rows={3}
                      placeholder="可选：写给学生的分类说明或复习提醒。"
                      className="mt-2 w-full rounded-md border border-ink/15 px-3 py-2 text-sm leading-6 outline-none focus:border-moss"
                    />
                  </label>

                  <details className="rounded-md border border-ink/10 bg-paper p-4">
                    <summary className="cursor-pointer text-sm font-medium text-ink">
                      可选：补充答案解析
                    </summary>
                    <p className="mt-2 text-xs leading-5 text-ink/55">
                      答案解析中心是统一维护入口。这里填写时仅保存到学生错题，之后仍可在答案解析中心继续编辑。
                    </p>
                    <div className="mt-4 grid gap-4">
                      <label className="block text-sm font-medium text-ink">
                        答案（可选，支持 LaTeX）
                        <textarea
                          name="answer"
                          rows={3}
                          placeholder="可选：例如 $\\frac{1}{2}$"
                          className="mt-2 w-full rounded-md border border-ink/15 px-3 py-2 font-mono text-sm leading-6 outline-none focus:border-moss"
                        />
                      </label>
                      <label className="block text-sm font-medium text-ink">
                        解析（可选，支持 LaTeX）
                        <textarea
                          name="analysis"
                          rows={5}
                          placeholder="可选：填写解题步骤、关键公式或易错点。"
                          className="mt-2 w-full rounded-md border border-ink/15 px-3 py-2 font-mono text-sm leading-6 outline-none focus:border-moss"
                        />
                      </label>
                    </div>
                  </details>

                  <div>
                    <SubmitButton
                      pendingText="确认中..."
                      className="inline-flex h-10 items-center gap-2 rounded-md bg-moss px-4 text-sm font-medium text-white"
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
          totalCount={count ?? 0}
        />
      </section>
    </main>
  );
}

async function getSubmitterIdsForSearch(searchValue: string) {
  const search = searchValue.trim().toLowerCase();

  if (!search) {
    return null;
  }

  const admin = createAdminClient();
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
    submitter: string;
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

async function getSubmitters(mistakes: PendingMistake[]) {
  const userIds = unique(mistakes.map((mistake) => mistake.user_id));
  const submitters = new Map<string, ProfileRow>();

  if (userIds.length === 0) {
    return submitters;
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .in("id", userIds);

  for (const profile of (data ?? []) as ProfileRow[]) {
    submitters.set(profile.id, profile);
  }

  return submitters;
}

function getRecommendations(
  mistake: PendingMistake,
  questionTypes: ClassifierQuestionType[],
  questionTypeMap: Map<string, QuestionTypeRow>
): Recommendation[] {
  const classificationText =
    mistake.raw_latex && mistake.input_type === "latex"
      ? normalizeLatexProblem(mistake.raw_latex).plainText
      : getClassificationText({
          inputType: mistake.input_type,
          rawText: mistake.raw_text || mistake.stem,
          latexContent: mistake.latex_content ?? ""
        });

  return classifyQuestion({
    stem: classificationText,
    questionTypes,
    limit: 3
  }).flatMap((result) => {
    const questionType = questionTypeMap.get(result.questionTypeId);

    if (!questionType) {
      return [];
    }

    return {
      id: questionType.id,
      level1: questionType.level1,
      level2: questionType.level2,
      level3: questionType.level3,
      score: Number(result.score.toFixed(2)),
      reasons: result.reasons
    };
  });
}

function filterReviewItems(
  items: ReviewMistakeItem[],
  filters: {
    submitter: string;
    submittedAt: string;
    level1: string;
    level2: string;
    level3: string;
    questionTypeId: string;
    keyword: string;
  }
) {
  const submitter = filters.submitter.trim().toLowerCase();
  const keyword = filters.keyword.trim().toLowerCase();

  return items.filter((item) => {
    if (submitter) {
      const submitterText = `${item.submitter?.full_name ?? ""} ${
        item.submitter?.email ?? ""
      } ${item.user_id}`.toLowerCase();

      if (!submitterText.includes(submitter)) {
        return false;
      }
    }

    if (!matchesSubmittedAt(item.created_at, filters.submittedAt)) {
      return false;
    }

    if (
      (filters.questionTypeId ||
        filters.level1 ||
        filters.level2 ||
        filters.level3) &&
      !matchesRecommendation(item.recommendations, filters)
    ) {
      return false;
    }

    if (keyword) {
      const searchable = `${item.raw_latex ?? ""} ${item.latex_content ?? ""} ${
        item.raw_text ?? ""
      } ${item.stem ?? ""}`.toLowerCase();

      if (!searchable.includes(keyword)) {
        return false;
      }
    }

    return true;
  });
}

function matchesSubmittedAt(createdAt: string, submittedAt: string) {
  if (!submittedAt) {
    return true;
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

  if (!startKey) {
    return true;
  }

  return createdAt >= startOfDateIso(startKey);
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

function matchesRecommendation(
  recommendations: Recommendation[],
  filters: {
    level1: string;
    level2: string;
    level3: string;
    questionTypeId: string;
  }
) {
  return recommendations.some((recommendation) => {
    if (filters.questionTypeId && recommendation.id !== filters.questionTypeId) {
      return false;
    }

    if (filters.level1 && recommendation.level1 !== filters.level1) {
      return false;
    }

    if (filters.level2 && recommendation.level2 !== filters.level2) {
      return false;
    }

    if (filters.level3 && recommendation.level3 !== filters.level3) {
      return false;
    }

    return true;
  });
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

function unique<T>(values: T[]) {
  return Array.from(new Set(values.filter(Boolean)));
}
