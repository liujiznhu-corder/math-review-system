import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  Flame,
  GraduationCap,
  PenLine,
  ShieldCheck,
  Target,
  TrendingDown,
  Users
} from "lucide-react";
import { redirect } from "next/navigation";
import { ExamCountdownCard } from "@/components/dashboard/ExamCountdownCard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { canManageQuestionTypes, getCurrentUserRole } from "@/lib/roles";
import type { Database } from "@/types/database";

type QuestionTypeInfo = Pick<
  Database["public"]["Tables"]["question_types"]["Row"],
  "id" | "level1" | "level2" | "level3"
>;

type CompletedReviewRawRow = {
  id: string;
  question_type_id: string | null;
  review_date: string;
  review_round: string;
  result: "mastered" | "not_mastered" | null;
  completed_at: string | null;
  mistakes:
    | {
        id: string;
        stem: string;
        raw_text: string | null;
        question_types: QuestionTypeInfo | QuestionTypeInfo[] | null;
      }
    | Array<{
        id: string;
        stem: string;
        raw_text: string | null;
        question_types: QuestionTypeInfo | QuestionTypeInfo[] | null;
      }>
    | null;
};

type RecentReview = {
  id: string;
  stem: string;
  questionType: QuestionTypeInfo | null;
  reviewRound: string;
  result: "mastered" | "not_mastered" | null;
  completedAt: string;
};

type MasterySummary = {
  questionTypeId: string;
  level1: string;
  level2: string;
  level3: string;
  masteredCount: number;
  notMasteredCount: number;
  totalReviews: number;
  masteryPercent: number;
};

type LevelMasterySummary = {
  level1: string;
  masteredCount: number;
  totalReviews: number;
  masteryPercent: number;
};

type TimelineDay = {
  date: string;
  label: string;
  mastered: number;
  notMastered: number;
};

type StudentDashboardData = {
  pendingTodayCount: number;
  completedTodayCount: number;
  completionRate: number;
  reviewStreak: number;
  weakQuestionTypes: MasterySummary[];
  levelMasteries: LevelMasterySummary[];
  recentReviews: RecentReview[];
  timeline: TimelineDay[];
  error: string | null;
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = await getCurrentUserRole();

  if (canManageQuestionTypes(role)) {
    return <TeacherDashboard />;
  }

  return <StudentDashboard userId={user.id} />;
}

async function StudentDashboard({ userId }: { userId: string }) {
  const stats = await getStudentDashboardData(userId);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8">
      <ExamCountdownCard />

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <DashboardShortcut
          href="/mistakes/new"
          icon={PenLine}
          title="录入错题"
          description="把今天的卡点沉淀下来"
        />
        <DashboardShortcut
          href="/mistakes"
          icon={ClipboardList}
          title="错题库"
          description="回看已分类的错题"
        />
        <DashboardShortcut
          href="/reviews"
          icon={BookOpenCheck}
          title="今日复习"
          description="完成到期复盘任务"
        />
      </section>

      <section className="mt-8">
        <div>
          <p className="text-sm font-medium text-clay">学习仪表盘</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">
            今日复盘状态
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">
            统计来自你的错题复习任务，帮助你看清今天进度、薄弱题型和最近复习走势。
          </p>
        </div>

        {stats.error ? (
          <p className="mt-6 rounded-md border border-clay/30 bg-clay/10 px-4 py-3 text-sm text-clay">
            学习仪表盘读取失败：{stats.error}
          </p>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={BookOpenCheck}
            label="今日待复习"
            value={stats.pendingTodayCount}
            helper="到今天为止仍未完成"
          />
          <MetricCard
            icon={CheckCircle2}
            label="今日已完成"
            value={stats.completedTodayCount}
            helper="今天完成的复习任务"
          />
          <MetricCard
            icon={Target}
            label="完成率"
            value={formatPercent(stats.completionRate)}
            helper="今日已完成 / 今日总任务"
          />
          <MetricCard
            icon={Flame}
            label="连续复习天数"
            value={stats.reviewStreak}
            helper="从今天往前连续完成"
          />
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <DashboardPanel
          icon={TrendingDown}
          title="你的薄弱题型"
          description="按三级题型统计掌握度，掌握度越低越靠前。"
        >
          {stats.weakQuestionTypes.length === 0 ? (
            <EmptyState text="完成复习后，这里会显示需要优先突破的题型。" />
          ) : (
            <div className="mt-5 space-y-4">
              {stats.weakQuestionTypes.map((summary) => (
                <div key={summary.questionTypeId}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-ink/55">
                        {summary.level1} / {summary.level2}
                      </p>
                      <h3 className="mt-1 text-sm font-semibold text-ink">
                        {summary.level3}
                      </h3>
                    </div>
                    <p className="text-sm font-semibold text-clay">
                      {formatPercent(summary.masteryPercent)}
                    </p>
                  </div>
                  <ProgressBar value={summary.masteryPercent} />
                  <p className="mt-1 text-xs text-ink/50">
                    已掌握 {summary.masteredCount} 次，未掌握{" "}
                    {summary.notMasteredCount} 次
                  </p>
                </div>
              ))}
            </div>
          )}
        </DashboardPanel>

        <DashboardPanel
          icon={BarChart3}
          title="知识点掌握度"
          description="按一级分类汇总最近复习结果。"
        >
          {stats.levelMasteries.length === 0 ? (
            <EmptyState text="暂无可统计的复习记录。" />
          ) : (
            <div className="mt-5 space-y-4">
              {stats.levelMasteries.map((summary) => (
                <div key={summary.level1}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-ink">
                      {summary.level1}
                    </h3>
                    <p className="text-sm text-ink/60">
                      {formatPercent(summary.masteryPercent)}
                    </p>
                  </div>
                  <ProgressBar value={summary.masteryPercent} />
                </div>
              ))}
            </div>
          )}
        </DashboardPanel>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <DashboardPanel
          icon={Activity}
          title="错题掌握曲线"
          description="最近 30 天复习结果时间轴。"
        >
          <div className="mt-5 flex h-40 items-end gap-1 overflow-x-auto pb-1">
            {stats.timeline.map((day) => {
              const total = day.mastered + day.notMastered;
              const height = total > 0 ? Math.min(100, 18 + total * 16) : 6;

              return (
                <div
                  key={day.date}
                  title={`${day.date} 已掌握 ${day.mastered}，未掌握 ${day.notMastered}`}
                  className="flex min-w-5 flex-1 flex-col items-center justify-end gap-1"
                >
                  <div
                    className="w-full rounded-t-sm bg-moss"
                    style={{ height: `${height}%` }}
                  >
                    {day.notMastered > 0 ? (
                      <div
                        className="w-full rounded-t-sm bg-clay"
                        style={{
                          height: `${Math.max(
                            18,
                            (day.notMastered / total) * 100
                          )}%`
                        }}
                      />
                    ) : null}
                  </div>
                  <span className="text-[10px] text-ink/45">{day.label}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex gap-4 text-xs text-ink/55">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-moss" />
              已掌握
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-clay" />
              未掌握
            </span>
          </div>
        </DashboardPanel>

        <DashboardPanel
          icon={ClipboardList}
          title="最近复习记录"
          description="最近完成的复习任务。"
        >
          {stats.recentReviews.length === 0 ? (
            <EmptyState text="完成今日复习后，这里会显示最近记录。" />
          ) : (
            <div className="mt-5 space-y-3">
              {stats.recentReviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-md border border-ink/10 bg-paper px-3 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-ink/55">
                      {review.questionType
                        ? `${review.questionType.level1} / ${review.questionType.level2}`
                        : "未确认题型"}
                    </p>
                    <span className="text-xs text-ink/45">
                      {formatDateTime(review.completedAt)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-ink/75">
                    {review.stem}
                  </p>
                  <p className="mt-2 text-xs text-ink/55">
                    {getReviewRoundLabel(review.reviewRound)} ·{" "}
                    {getResultLabel(review.result)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </DashboardPanel>
      </section>
    </main>
  );
}

export async function TeacherDashboard() {
  const stats = await getTeacherStats();

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8">
      <div>
        <p className="text-sm font-medium text-clay">教师仪表盘</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">基础统计</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">
          汇总学生、题型库、待审核错题和近期复习完成情况。跨学生统计在服务端使用
          service role 查询。
        </p>
      </div>

      {stats.error ? (
        <p className="mt-6 rounded-md border border-clay/30 bg-clay/10 px-4 py-3 text-sm text-clay">
          教师统计读取失败：{stats.error}
        </p>
      ) : null}

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          icon={Users}
          label="学生数"
          value={stats.studentCount}
          helper="profiles.role = student"
        />
        <MetricCard
          icon={GraduationCap}
          label="启用题型"
          value={stats.questionTypeCount}
          helper="question_types.is_active = true"
        />
        <MetricCard
          icon={ShieldCheck}
          label="待审核错题"
          value={stats.pendingMistakeCount}
          helper="classification_status = pending"
        />
        <MetricCard
          icon={Activity}
          label="错题总数"
          value={stats.mistakeCount}
          helper="全体学生错题"
        />
        <MetricCard
          icon={CheckCircle2}
          label="近 7 天完成复习"
          value={stats.completedReviewCount}
          helper="review_tasks.status = completed"
        />
        <MetricCard
          icon={Target}
          label="平均掌握度"
          value={`${Math.round(stats.averageMastery)}%`}
          helper="knowledge_mastery 平均值"
        />
      </section>
    </main>
  );
}

async function getStudentDashboardData(
  userId: string
): Promise<StudentDashboardData> {
  const supabase = await createClient();
  const todayKey = getChinaDateKey(new Date());
  const tomorrowKey = addDaysToDateKey(todayKey, 1);
  const todayStartIso = startOfDateIso(todayKey);
  const tomorrowStartIso = startOfDateIso(tomorrowKey);

  const [
    pendingToday,
    completedToday,
    completedDateRows,
    completedReviewRows
  ] = await Promise.all([
    supabase
      .from("review_tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "pending")
      .lte("review_date", todayKey),
    supabase
      .from("review_tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed")
      .gte("completed_at", todayStartIso)
      .lt("completed_at", tomorrowStartIso),
    supabase
      .from("review_tasks")
      .select("completed_at")
      .eq("user_id", userId)
      .eq("status", "completed")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(180),
    supabase
      .from("review_tasks")
      .select(
        "id, question_type_id, review_date, review_round, result, completed_at, mistakes(id, stem, raw_text, question_types(id, level1, level2, level3))"
      )
      .eq("user_id", userId)
      .eq("status", "completed")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(300)
  ]);

  const completedRows =
    ((completedReviewRows.data ?? []) as unknown as CompletedReviewRawRow[]) ??
    [];
  const masterySummaries = buildMasterySummaries(completedRows);
  const totalToday = (pendingToday.count ?? 0) + (completedToday.count ?? 0);

  return {
    pendingTodayCount: pendingToday.count ?? 0,
    completedTodayCount: completedToday.count ?? 0,
    completionRate:
      totalToday > 0 ? ((completedToday.count ?? 0) / totalToday) * 100 : 0,
    reviewStreak: calculateReviewStreak(
      (completedDateRows.data ?? [])
        .map((row) => row.completed_at)
        .filter((value): value is string => Boolean(value))
    ),
    weakQuestionTypes: masterySummaries.slice(0, 5),
    levelMasteries: buildLevelMasteries(masterySummaries),
    recentReviews: buildRecentReviews(completedRows).slice(0, 5),
    timeline: buildTimeline(completedRows),
    error:
      pendingToday.error?.message ??
      completedToday.error?.message ??
      completedDateRows.error?.message ??
      completedReviewRows.error?.message ??
      null
  };
}

async function getTeacherStats() {
  try {
    const admin = createAdminClient();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [
      students,
      questionTypes,
      pendingMistakes,
      mistakes,
      completedReviews,
      masteryRows
    ] = await Promise.all([
      admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "student"),
      admin
        .from("question_types")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      admin
        .from("mistakes")
        .select("id", { count: "exact", head: true })
        .eq("classification_status", "pending"),
      admin.from("mistakes").select("id", { count: "exact", head: true }),
      admin
        .from("review_tasks")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed")
        .gte("completed_at", sevenDaysAgo.toISOString()),
      admin.from("knowledge_mastery").select("mastery_percent")
    ]);

    const masteryValues =
      masteryRows.data?.map((row) => Number(row.mastery_percent)) ?? [];
    const averageMastery =
      masteryValues.length > 0
        ? masteryValues.reduce((sum, value) => sum + value, 0) /
          masteryValues.length
        : 0;

    return {
      studentCount: students.count ?? 0,
      questionTypeCount: questionTypes.count ?? 0,
      pendingMistakeCount: pendingMistakes.count ?? 0,
      mistakeCount: mistakes.count ?? 0,
      completedReviewCount: completedReviews.count ?? 0,
      averageMastery,
      error:
        students.error?.message ??
        questionTypes.error?.message ??
        pendingMistakes.error?.message ??
        mistakes.error?.message ??
        completedReviews.error?.message ??
        masteryRows.error?.message ??
        null
    };
  } catch (error) {
    return {
      studentCount: 0,
      questionTypeCount: 0,
      pendingMistakeCount: 0,
      mistakeCount: 0,
      completedReviewCount: 0,
      averageMastery: 0,
      error: error instanceof Error ? error.message : "未知错误"
    };
  }
}

function buildMasterySummaries(rows: CompletedReviewRawRow[]) {
  const summaries = new Map<string, MasterySummary>();

  for (const row of rows) {
    const mistake = normalizeMistake(row.mistakes);
    const questionType = normalizeQuestionType(mistake?.question_types ?? null);

    if (!questionType || !row.result) {
      continue;
    }

    const current = summaries.get(questionType.id) ?? {
      questionTypeId: questionType.id,
      level1: questionType.level1,
      level2: questionType.level2,
      level3: questionType.level3,
      masteredCount: 0,
      notMasteredCount: 0,
      totalReviews: 0,
      masteryPercent: 0
    };

    current.totalReviews += 1;

    if (row.result === "mastered") {
      current.masteredCount += 1;
    }

    if (row.result === "not_mastered") {
      current.notMasteredCount += 1;
    }

    current.masteryPercent =
      current.totalReviews > 0
        ? (current.masteredCount / current.totalReviews) * 100
        : 0;

    summaries.set(questionType.id, current);
  }

  return Array.from(summaries.values()).sort((left, right) => {
    if (left.masteryPercent !== right.masteryPercent) {
      return left.masteryPercent - right.masteryPercent;
    }

    return right.totalReviews - left.totalReviews;
  });
}

function buildLevelMasteries(summaries: MasterySummary[]) {
  const levelMap = new Map<string, LevelMasterySummary>();

  for (const summary of summaries) {
    const current = levelMap.get(summary.level1) ?? {
      level1: summary.level1,
      masteredCount: 0,
      totalReviews: 0,
      masteryPercent: 0
    };

    current.masteredCount += summary.masteredCount;
    current.totalReviews += summary.totalReviews;
    current.masteryPercent =
      current.totalReviews > 0
        ? (current.masteredCount / current.totalReviews) * 100
        : 0;

    levelMap.set(summary.level1, current);
  }

  return Array.from(levelMap.values()).sort((left, right) =>
    left.level1.localeCompare(right.level1, "zh-CN")
  );
}

function buildRecentReviews(rows: CompletedReviewRawRow[]) {
  const reviews: RecentReview[] = [];

  for (const row of rows) {
    const mistake = normalizeMistake(row.mistakes);

    if (!mistake || !row.completed_at) {
      continue;
    }

    reviews.push({
      id: row.id,
      stem: mistake.raw_text || mistake.stem,
      questionType: normalizeQuestionType(mistake.question_types),
      reviewRound: row.review_round,
      result: row.result,
      completedAt: row.completed_at
    });
  }

  return reviews;
}

function buildTimeline(rows: CompletedReviewRawRow[]) {
  const todayKey = getChinaDateKey(new Date());
  const days = Array.from({ length: 30 }, (_, index) => {
    const dateKey = addDaysToDateKey(todayKey, index - 29);
    const [, month, day] = dateKey.split("-");

    return {
      date: dateKey,
      label: `${Number(month)}/${Number(day)}`,
      mastered: 0,
      notMastered: 0
    };
  });
  const dayMap = new Map(days.map((day) => [day.date, day]));

  for (const row of rows) {
    if (!row.completed_at || !row.result) {
      continue;
    }

    const dateKey = getChinaDateKey(new Date(row.completed_at));
    const day = dayMap.get(dateKey);

    if (!day) {
      continue;
    }

    if (row.result === "mastered") {
      day.mastered += 1;
    }

    if (row.result === "not_mastered") {
      day.notMastered += 1;
    }
  }

  return days;
}

function calculateReviewStreak(completedAtValues: string[]) {
  const completedDates = new Set(
    completedAtValues.map((value) => getChinaDateKey(new Date(value)))
  );
  let cursor = getChinaDateKey(new Date());
  let streak = 0;

  while (completedDates.has(cursor)) {
    streak += 1;
    cursor = addDaysToDateKey(cursor, -1);
  }

  return streak;
}

function DashboardShortcut({
  href,
  icon: Icon,
  title,
  description
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-md border border-ink/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-moss/40 hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-paper text-moss">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-sm text-ink/60">{description}</p>
        </div>
      </div>
    </Link>
  );
}

function DashboardPanel({
  icon: Icon,
  title,
  description,
  children
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-ink/10 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-moss/10 text-moss">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-ink/60">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  helper: string;
}) {
  return (
    <div className="rounded-md border border-ink/10 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink/60">{label}</p>
        <Icon className="h-5 w-5 text-moss" />
      </div>
      <p className="mt-4 text-3xl font-semibold text-ink">{value}</p>
      <p className="mt-2 text-xs text-ink/50">{helper}</p>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="mt-2 h-2 rounded-full bg-paper">
      <div
        className="h-2 rounded-full bg-moss"
        style={{ width: `${Math.max(0, Math.min(value, 100))}%` }}
      />
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="mt-5 rounded-md border border-dashed border-ink/20 bg-paper px-4 py-8 text-center text-sm text-ink/60">
      {text}
    </div>
  );
}

function normalizeQuestionType(
  value: QuestionTypeInfo | QuestionTypeInfo[] | null
) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function normalizeMistake(value: CompletedReviewRawRow["mistakes"]) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function getResultLabel(result: RecentReview["result"]) {
  if (result === "mastered") {
    return "已掌握";
  }

  if (result === "not_mastered") {
    return "未掌握";
  }

  return "未记录";
}

function getReviewRoundLabel(reviewRound: string) {
  const labels: Record<string, string> = {
    day1: "第1天",
    day3: "第3天",
    day7: "第7天",
    day14: "第14天",
    day30: "第30天",
    retry_day3: "补复习第3天",
    retry_day7: "补复习第7天"
  };

  return labels[reviewRound] ?? reviewRound;
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
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
