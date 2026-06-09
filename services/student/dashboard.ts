import { createClient } from "@/lib/supabase/server";
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

export type RecentReview = {
  id: string;
  stem: string;
  questionType: QuestionTypeInfo | null;
  reviewRound: string;
  result: "mastered" | "not_mastered" | null;
  completedAt: string;
};

export type MasterySummary = {
  questionTypeId: string;
  level1: string;
  level2: string;
  level3: string;
  masteredCount: number;
  notMasteredCount: number;
  totalReviews: number;
  masteryPercent: number;
};

export type LevelMasterySummary = {
  level1: string;
  masteredCount: number;
  totalReviews: number;
  masteryPercent: number;
};

export type TimelineDay = {
  date: string;
  label: string;
  mastered: number;
  notMastered: number;
};

export type StudentDashboardData = {
  pendingTodayCount: number;
  completedTodayCount: number;
  weakPracticeTotalCount: number;
  weakPracticeCompletedCount: number;
  completionRate: number;
  reviewStreak: number;
  weakQuestionTypes: MasterySummary[];
  levelMasteries: LevelMasterySummary[];
  recentReviews: RecentReview[];
  timeline: TimelineDay[];
  error: string | null;
};

export async function getStudentDashboardData(
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
    weakPracticeToday,
    weakPracticeCompletedToday,
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
      .from("weak_practice_tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("practice_date", todayKey),
    supabase
      .from("weak_practice_tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("practice_date", todayKey)
      .eq("status", "completed"),
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
    weakPracticeTotalCount: weakPracticeToday.count ?? 0,
    weakPracticeCompletedCount: weakPracticeCompletedToday.count ?? 0,
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
      weakPracticeToday.error?.message ??
      weakPracticeCompletedToday.error?.message ??
      completedDateRows.error?.message ??
      completedReviewRows.error?.message ??
      null
  };
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

function normalizeQuestionType(
  value: QuestionTypeInfo | QuestionTypeInfo[] | null
) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function normalizeMistake(value: CompletedReviewRawRow["mistakes"]) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
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
