import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  FileText,
  Flame,
  GraduationCap,
  LibraryBig,
  PenLine,
  PlusCircle,
  ShieldCheck,
  Target,
  TrendingDown,
  Users
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExamCountdownCard } from "@/components/dashboard/ExamCountdownCard";
import {
  StudentActionCard,
  StudentProgressBar,
  StudentSectionCard,
  StudentStatCard
} from "@/components/student/StudentDashboardCards";
import { StudentCard } from "@/components/student/StudentCard";
import { StudentEmptyState } from "@/components/student/StudentEmptyState";
import { StudentHeader } from "@/components/student/StudentHeader";
import { StudentPageShell } from "@/components/student/StudentPageShell";
import { canManageQuestionTypes, getCurrentUserRole } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStudentDashboardData } from "@/services/student/dashboard";

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
    <StudentPageShell maxWidth="6xl">
      <div className="space-y-5">
        <section className="grid grid-cols-1 items-start gap-5 min-[900px]:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)] xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
          <StudentCard variant="soft" padding="md">
            <StudentHeader
              eyebrow="学习仪表盘"
              title="今天的数学复盘"
              description="先看今天任务，再决定从复习、错题录入还是专项训练开始。保留现有学习数据，只把下一步行动变得更清楚。"
            />
            <div className="mt-5 rounded-2xl border border-moss/10 bg-moss/5 px-4 py-3">
              <p className="text-sm font-semibold text-moss">今日建议</p>
              <p className="mt-2 text-sm leading-6 text-ink/70">
                先完成到期复习 → 再进行薄弱巩固 → 最后录入新错题。
              </p>
              <p className="mt-2 text-xs leading-5 text-ink/50">
                下方入口卡片会带你进入对应流程，今天只要从第一步开始就很好。
              </p>
            </div>
          </StudentCard>

          <ExamCountdownCard />
        </section>

        {stats.error ? (
          <p className="rounded-2xl border border-clay/30 bg-clay/10 px-4 py-3 text-sm text-clay">
            学习仪表盘读取失败：{stats.error}
          </p>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StudentActionCard
            href="/mistakes/new"
            icon={PenLine}
            title="录入错题"
            description="把今天的卡点沉淀下来"
            tone="moss"
          />
          <StudentActionCard
            href="/mistakes"
            icon={ClipboardList}
            title="错题库"
            description="回看已分类的错题"
            tone="indigo"
          />
          <StudentActionCard
            href="/reviews"
            icon={BookOpenCheck}
            title="今日复习"
            description="完成到期复盘任务"
            meta={`${stats.pendingTodayCount} 个待复习`}
            cta="开始复习 →"
            featured
            tone="sky"
          />
          <StudentActionCard
            href="/weak-practice"
            icon={Target}
            title="今日薄弱巩固"
            description={`今日 5 题，已完成 ${stats.weakPracticeCompletedCount} 题`}
            tone="clay"
          />
          <StudentActionCard
            href="/practice"
            icon={Target}
            title="专项训练"
            description="主动选择三级题型刷 5 题"
            tone="emerald"
          />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StudentStatCard
            icon={BookOpenCheck}
            label="今日待复习"
            value={stats.pendingTodayCount}
            helper="到今天为止仍未完成"
            tone="sky"
          />
          <StudentStatCard
            icon={CheckCircle2}
            label="今日已完成"
            value={stats.completedTodayCount}
            helper={getCompletedTodayHelper(stats.completedTodayCount)}
            tone={stats.completedTodayCount > 0 ? "emerald" : "neutral"}
          />
          <StudentStatCard
            icon={Target}
            label="完成率"
            value={formatPercent(stats.completionRate)}
            helper={getCompletionRateHelper(stats.completionRate)}
            tone={stats.completionRate >= 100 ? "emerald" : "indigo"}
          />
          <StudentStatCard
            icon={Flame}
            label="连续复习天数"
            value={stats.reviewStreak}
            helper={getReviewStreakHelper(stats.reviewStreak)}
            badge={stats.reviewStreak >= 7 ? "稳定节奏中" : undefined}
            tone={stats.reviewStreak > 0 ? "clay" : "neutral"}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <StudentSectionCard
            icon={TrendingDown}
            title="你的薄弱题型"
            description="按三级题型统计掌握度，掌握度越低越靠前。"
          >
            {stats.weakQuestionTypes.length === 0 ? (
              <StudentEmptyState>
                完成复习后，这里会显示需要优先突破的题型。
              </StudentEmptyState>
            ) : (
              <div className="mt-5 divide-y divide-ink/10">
                {stats.weakQuestionTypes.map((summary) => (
                  <div key={summary.questionTypeId} className="py-4 first:pt-0">
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
                    <StudentProgressBar value={summary.masteryPercent} />
                    <p className="mt-1 text-xs text-ink/50">
                      已掌握 {summary.masteredCount} 次，未掌握{" "}
                      {summary.notMasteredCount} 次
                    </p>
                  </div>
                ))}
              </div>
            )}
          </StudentSectionCard>

          <StudentSectionCard
            icon={BarChart3}
            title="知识点掌握度"
            description="按一级分类汇总最近复习结果。"
          >
            {stats.levelMasteries.length === 0 ? (
              <StudentEmptyState>暂无可统计的复习记录。</StudentEmptyState>
            ) : (
              <div className="mt-5 divide-y divide-ink/10">
                {stats.levelMasteries.map((summary) => (
                  <div key={summary.level1} className="py-4 first:pt-0">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-ink">
                        {summary.level1}
                      </h3>
                      <p className="text-sm text-ink/60">
                        {formatPercent(summary.masteryPercent)}
                      </p>
                    </div>
                    <StudentProgressBar value={summary.masteryPercent} />
                  </div>
                ))}
              </div>
            )}
          </StudentSectionCard>
        </section>

        <StudentSectionCard
          icon={Activity}
          title="最近 7 天学习总结"
          description="汇总最近一周的录题、复习、专项训练和薄弱巩固完成情况。"
        >
          {hasSevenDaySummaryData(stats.sevenDaySummary) ? (
            <div className="mt-5 grid gap-5 border-t border-ink/10 pt-5 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryItem
                label="新增错题"
                value={stats.sevenDaySummary.newMistakeCount}
                helper="最近 7 天录入的错题"
              />
              <SummaryItem
                label="完成复习"
                value={stats.sevenDaySummary.completedReviewCount}
                helper="最近 7 天完成的复习任务"
              />
              <SummaryItem
                label="专项训练"
                value={stats.sevenDaySummary.completedPracticeCount}
                helper="最近 7 天完成的专项训练题"
              />
              <SummaryItem
                label="薄弱巩固"
                value={stats.sevenDaySummary.completedWeakPracticeCount}
                helper="最近 7 天完成的薄弱巩固题"
              />
            </div>
          ) : (
            <StudentEmptyState>
              最近还没有学习记录，完成复习或训练后这里会自动更新。
            </StudentEmptyState>
          )}
        </StudentSectionCard>
      </div>
    </StudentPageShell>
  );
}

export async function TeacherDashboard() {
  const stats = await getTeacherStats();
  const priorityTodoCount =
    stats.pendingMistakeCount + stats.pendingStudentSolutionCount;

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
      <section className="rounded-md border border-ink/10 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <p className="text-sm font-medium text-clay">教师工作台</p>
            <h1 className="mt-2 text-3xl font-semibold text-ink">
              今天先处理最影响学生复盘的事
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/65">
              从待审核错题和待补答案解析开始，再维护教师题库与题型库。这里仍保留原有统计，只把下一步工作入口放得更清楚。
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <TeacherHeroLink
                href="/teacher/review-mistakes"
                label={`${stats.pendingMistakeCount} 道待审核错题`}
              />
              <TeacherHeroLink
                href="/teacher/solutions?source=mistakes"
                label={`${stats.pendingStudentSolutionCount} 道学生错题待补答案解析`}
              />
            </div>
          </div>

          <div className="rounded-md border border-moss/15 bg-moss/5 p-4">
            <p className="text-sm font-medium text-moss">今日待办概览</p>
            <p className="mt-3 text-4xl font-semibold text-ink">
              {priorityTodoCount}
              <span className="ml-2 text-base font-medium text-ink/60">项</span>
            </p>
            <p className="mt-3 text-sm leading-6 text-ink/65">
              优先完成学生提交后的确认和答案解析补充，学生端复习体验会立刻更完整。
            </p>
          </div>
        </div>
      </section>

      {stats.error ? (
        <p className="mt-6 rounded-md border border-clay/30 bg-clay/10 px-4 py-3 text-sm text-clay">
          教师统计读取失败：{stats.error}
        </p>
      ) : null}

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <TeacherTaskCard
          href="/teacher/review-mistakes"
          icon={ShieldCheck}
          title="待审核错题"
          value={stats.pendingMistakeCount}
          unit="道"
          description="确认题型后进入学生复习计划"
          actionLabel="去审核错题"
          featured={stats.pendingMistakeCount > 0}
        />
        <TeacherTaskCard
          href="/teacher/solutions?source=mistakes"
          icon={FileText}
          title="待补答案解析"
          value={stats.pendingStudentSolutionCount}
          unit="道"
          description="学生提交错题待补答案解析"
          actionLabel="去补答案解析"
          featured={stats.pendingStudentSolutionCount > 0}
        />
        <TeacherTaskCard
          href="/teacher/problems"
          icon={LibraryBig}
          title="教师题库维护"
          value={stats.problemCount}
          unit="题"
          description="检查题库题目与来源信息"
          actionLabel="管理教师题库"
        />
        <TeacherTaskCard
          href="/teacher/problems/new"
          icon={PlusCircle}
          title="录入新题目"
          value="新增"
          description="粘贴原生 LaTeX 并保存到题库"
          actionLabel="录入题目"
        />
        <TeacherTaskCard
          href="/question-types"
          icon={GraduationCap}
          title="题型库管理"
          value={stats.questionTypeCount}
          unit="个"
          description="维护三级题型和识别特征"
          actionLabel="管理题型库"
        />
      </section>

      <section className="mt-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-clay">基础统计</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">
              教学数据概览
            </h2>
          </div>
          <p className="text-sm leading-6 text-ink/55">
            统计仍沿用原教师仪表盘口径，跨学生数据在服务端读取。
          </p>
        </div>
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          icon={Users}
          label="学生数"
          value={stats.studentCount}
          helper="当前学生档案数量"
        />
        <MetricCard
          icon={GraduationCap}
          label="启用题型"
          value={stats.questionTypeCount}
          helper="可用于分类和训练"
        />
        <MetricCard
          icon={ShieldCheck}
          label="待审核错题"
          value={stats.pendingMistakeCount}
          helper="等待教师确认题型"
        />
        <MetricCard
          icon={Activity}
          label="错题总数"
          value={stats.mistakeCount}
          helper="全体学生错题沉淀"
        />
        <MetricCard
          icon={CheckCircle2}
          label="近 7 天完成复习"
          value={stats.completedReviewCount}
          helper="学生近期复习完成量"
        />
        <MetricCard
          icon={Target}
          label="平均掌握度"
          value={`${Math.round(stats.averageMastery)}%`}
          helper="知识点掌握度均值"
        />
      </section>
    </main>
  );
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
      masteryRows,
      pendingStudentSolutions,
      problems
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
      admin.from("knowledge_mastery").select("mastery_percent"),
      admin
        .from("mistakes")
        .select("id", { count: "exact", head: true })
        .in("classification_status", ["student_selected", "teacher_confirmed"])
        .not("question_type_id", "is", null)
        .or("answer.is.null,analysis.is.null,answer.eq.,analysis.eq."),
      admin.from("problems").select("id", { count: "exact", head: true })
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
      pendingStudentSolutionCount: pendingStudentSolutions.count ?? 0,
      problemCount: problems.count ?? 0,
      averageMastery,
      error:
        students.error?.message ??
        questionTypes.error?.message ??
        pendingMistakes.error?.message ??
        mistakes.error?.message ??
        completedReviews.error?.message ??
        masteryRows.error?.message ??
        pendingStudentSolutions.error?.message ??
        problems.error?.message ??
        null
    };
  } catch (error) {
    return {
      studentCount: 0,
      questionTypeCount: 0,
      pendingMistakeCount: 0,
      mistakeCount: 0,
      completedReviewCount: 0,
      pendingStudentSolutionCount: 0,
      problemCount: 0,
      averageMastery: 0,
      error: error instanceof Error ? error.message : "未知错误"
    };
  }
}

function TeacherHeroLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-medium text-white hover:bg-ink/90"
    >
      {label}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

function TeacherTaskCard({
  href,
  icon: Icon,
  title,
  value,
  unit,
  description,
  actionLabel,
  featured = false
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  value: number | string;
  unit?: string;
  description: string;
  actionLabel: string;
  featured?: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "group flex min-h-[188px] flex-col justify-between rounded-md border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        featured
          ? "border-moss/25 bg-moss/10"
          : "border-ink/10 bg-white"
      ].join(" ")}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <span
            className={[
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
              featured ? "bg-white text-moss" : "bg-paper text-ink/70"
            ].join(" ")}
          >
            <Icon className="h-5 w-5" />
          </span>
          <ArrowRight className="h-4 w-4 text-ink/35 transition group-hover:translate-x-0.5 group-hover:text-moss" />
        </div>
        <p className="mt-4 text-sm font-medium text-ink/60">{title}</p>
        <p className="mt-2 text-3xl font-semibold text-ink">
          {value}
          {unit ? (
            <span className="ml-1 text-sm font-medium text-ink/55">
              {unit}
            </span>
          ) : null}
        </p>
        <p className="mt-3 text-sm leading-6 text-ink/60">{description}</p>
      </div>
      <p className="mt-4 text-sm font-medium text-moss">{actionLabel} →</p>
    </Link>
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
    <div className="rounded-md border border-ink/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink/60">{label}</p>
        <Icon className="h-5 w-5 text-moss" />
      </div>
      <p className="mt-4 text-3xl font-semibold text-ink">{value}</p>
      <p className="mt-2 text-xs text-ink/50">{helper}</p>
    </div>
  );
}

function SummaryItem({
  label,
  value,
  helper
}: {
  label: string;
  value: number;
  helper: string;
}) {
  return (
    <div>
      <p className="text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-2 text-sm font-medium text-ink">{label}</p>
      <p className="mt-1 text-xs leading-5 text-ink/55">{helper}</p>
    </div>
  );
}

function hasSevenDaySummaryData(summary: {
  newMistakeCount: number;
  completedReviewCount: number;
  completedPracticeCount: number;
  completedWeakPracticeCount: number;
}) {
  return (
    summary.newMistakeCount > 0 ||
    summary.completedReviewCount > 0 ||
    summary.completedPracticeCount > 0 ||
    summary.completedWeakPracticeCount > 0
  );
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function getCompletedTodayHelper(value: number) {
  if (value === 0) {
    return "完成第一道后，这里会亮起来";
  }

  return `今天已经完成 ${value} 道，继续保持`;
}

function getCompletionRateHelper(value: number) {
  if (value <= 0) {
    return "完成第一道后开始累计";
  }

  if (value >= 100) {
    return "今日复习已完成";
  }

  return "已经启动，继续推进";
}

function getReviewStreakHelper(value: number) {
  if (value === 0) {
    return "今天开始第一天";
  }

  return `已经连续 ${value} 天复习`;
}
