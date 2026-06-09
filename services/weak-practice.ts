import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type SourceType =
  Database["public"]["Tables"]["weak_practice_tasks"]["Row"]["source_type"];

type PracticeResult =
  Database["public"]["Tables"]["weak_practice_tasks"]["Row"]["result"];

type QuestionTypeInfo = Pick<
  Database["public"]["Tables"]["question_types"]["Row"],
  "id" | "level1" | "level2" | "level3"
>;

type ProblemInfo = Pick<
  Database["public"]["Tables"]["problems"]["Row"],
  "id" | "question_type_id" | "raw_latex" | "answer" | "analysis"
> & {
  question_types: QuestionTypeInfo | QuestionTypeInfo[] | null;
};

type PracticeTaskRawRow = Pick<
  Database["public"]["Tables"]["weak_practice_tasks"]["Row"],
  | "id"
  | "practice_date"
  | "source_type"
  | "status"
  | "result"
  | "completed_at"
  | "created_at"
> & {
  problems: ProblemInfo | ProblemInfo[] | null;
};

export type WeakPracticeTask = {
  id: string;
  practiceDate: string;
  sourceType: SourceType;
  status: "pending" | "completed";
  result: PracticeResult;
  completedAt: string | null;
  problem: {
    id: string;
    rawLatex: string;
    answer: string | null;
    analysis: string | null;
    questionType: QuestionTypeInfo | null;
  } | null;
};

type WeaknessScore = {
  questionTypeId: string;
  mistakeCount: number;
  notMasteredCount: number;
  recentMistakeCount: number;
  score: number;
};

type CandidateProblem = {
  id: string;
  questionTypeId: string;
  hasSolution: boolean;
};

export async function generateDailyWeakPractice(userId: string, date: string) {
  const existingTasks = await getWeakPracticeTasks(userId, date);

  if (existingTasks.length >= 5) {
    return existingTasks;
  }

  const supabase = await createClient();
  const [{ data: problemRows, error: problemsError }, weaknessScores] =
    await Promise.all([
      supabase
        .from("problems")
        .select("id, question_type_id, raw_latex, answer, analysis")
        .not("question_type_id", "is", null),
      calculateWeaknessScores(userId, date)
    ]);

  if (problemsError) {
    throw new Error(`读取教师题库失败：${problemsError.message}`);
  }

  const candidates = ((problemRows ?? []) as Array<{
    id: string;
    question_type_id: string | null;
    answer: string | null;
    analysis: string | null;
  }>)
    .filter((problem) => Boolean(problem.question_type_id))
    .map((problem) => ({
      id: problem.id,
      questionTypeId: problem.question_type_id as string,
      hasSolution: Boolean(problem.answer?.trim() || problem.analysis?.trim())
    }));

  if (candidates.length === 0) {
    return existingTasks;
  }

  const existingProblemIds = new Set(
    existingTasks
      .map((task) => task.problem?.id)
      .filter((id): id is string => Boolean(id))
  );
  const selected = selectPracticeProblems({
    candidates,
    existingProblemIds,
    weaknessScores,
    targetCount: Math.max(0, 5 - existingTasks.length)
  });

  if (selected.length === 0) {
    return existingTasks;
  }

  const { error: insertError } = await supabase
    .from("weak_practice_tasks")
    .insert(
      selected.map((item) => ({
        user_id: userId,
        problem_id: item.problem.id,
        question_type_id: item.problem.questionTypeId,
        practice_date: date,
        source_type: item.sourceType,
        status: "pending"
      }))
    );

  if (insertError) {
    throw new Error(`生成薄弱巩固任务失败：${insertError.message}`);
  }

  return getWeakPracticeTasks(userId, date);
}

export async function getWeakPracticeTasks(userId: string, date: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("weak_practice_tasks")
    .select(
      "id, practice_date, source_type, status, result, completed_at, created_at, problems(id, question_type_id, raw_latex, answer, analysis, question_types(id, level1, level2, level3))"
    )
    .eq("user_id", userId)
    .eq("practice_date", date)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`读取薄弱巩固任务失败：${error.message}`);
  }

  return ((data ?? []) as unknown as PracticeTaskRawRow[]).map(
    normalizePracticeTask
  );
}

export async function completeWeakPracticeTask({
  taskId,
  userId,
  result
}: {
  taskId: string;
  userId: string;
  result: Exclude<PracticeResult, null>;
}) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("weak_practice_tasks")
    .update({
      status: "completed",
      result,
      completed_at: new Date().toISOString()
    })
    .eq("id", taskId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`更新薄弱巩固任务失败：${error.message}`);
  }
}

async function calculateWeaknessScores(userId: string, date: string) {
  const supabase = await createClient();
  const recentStart = addDaysToDateKey(date, -6);
  const [{ data: mistakes, error: mistakesError }, { data: reviews, error }] =
    await Promise.all([
      supabase
        .from("mistakes")
        .select("id, question_type_id, created_at")
        .eq("user_id", userId)
        .not("question_type_id", "is", null),
      supabase
        .from("review_tasks")
        .select("id, question_type_id")
        .eq("user_id", userId)
        .eq("result", "not_mastered")
        .not("question_type_id", "is", null)
    ]);

  if (mistakesError) {
    throw new Error(`计算薄弱题型失败：${mistakesError.message}`);
  }

  if (error) {
    throw new Error(`计算未掌握次数失败：${error.message}`);
  }

  const scoreMap = new Map<string, WeaknessScore>();

  for (const mistake of (mistakes ?? []) as Array<{
    question_type_id: string | null;
    created_at: string;
  }>) {
    if (!mistake.question_type_id) {
      continue;
    }

    const current = getOrCreateScore(scoreMap, mistake.question_type_id);
    current.mistakeCount += 1;

    if (mistake.created_at.slice(0, 10) >= recentStart) {
      current.recentMistakeCount += 1;
    }
  }

  for (const review of (reviews ?? []) as Array<{
    question_type_id: string | null;
  }>) {
    if (!review.question_type_id) {
      continue;
    }

    getOrCreateScore(scoreMap, review.question_type_id).notMasteredCount += 1;
  }

  return Array.from(scoreMap.values())
    .map((item) => ({
      ...item,
      score:
        item.mistakeCount * 0.5 +
        item.notMasteredCount * 0.3 +
        item.recentMistakeCount * 0.2
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);
}

function selectPracticeProblems({
  candidates,
  existingProblemIds,
  weaknessScores,
  targetCount
}: {
  candidates: CandidateProblem[];
  existingProblemIds: Set<string>;
  weaknessScores: WeaknessScore[];
  targetCount: number;
}) {
  const selected: Array<{
    problem: CandidateProblem;
    sourceType: SourceType;
  }> = [];
  const usedProblemIds = new Set(existingProblemIds);
  const weakTypeIds = weaknessScores.slice(0, 3).map((item) => item.questionTypeId);
  const secondaryTypeIds = weaknessScores
    .slice(3, 4)
    .map((item) => item.questionTypeId);

  pickIntoSelection({
    candidates,
    count: Math.min(3, targetCount),
    selected,
    sourceType: "weak",
    typeIds: weakTypeIds,
    usedProblemIds
  });

  if (selected.length < targetCount) {
    pickIntoSelection({
      candidates,
      count: 1,
      selected,
      sourceType: "secondary",
      typeIds:
        secondaryTypeIds.length > 0
          ? secondaryTypeIds
          : weaknessScores.slice(1).map((item) => item.questionTypeId),
      usedProblemIds
    });
  }

  while (selected.length < targetCount) {
    const before = selected.length;
    pickIntoSelection({
      candidates,
      count: targetCount - selected.length,
      selected,
      sourceType: "random",
      typeIds: [],
      usedProblemIds
    });

    if (selected.length === before) {
      break;
    }
  }

  return selected;
}

function pickIntoSelection({
  candidates,
  count,
  selected,
  sourceType,
  typeIds,
  usedProblemIds
}: {
  candidates: CandidateProblem[];
  count: number;
  selected: Array<{ problem: CandidateProblem; sourceType: SourceType }>;
  sourceType: SourceType;
  typeIds: string[];
  usedProblemIds: Set<string>;
}) {
  if (count <= 0) {
    return;
  }

  const typeIdSet = new Set(typeIds);
  const pool = shuffle(
    candidates.filter(
      (problem) =>
        !usedProblemIds.has(problem.id) &&
        (typeIds.length === 0 || typeIdSet.has(problem.questionTypeId))
    )
  ).sort((left, right) => Number(right.hasSolution) - Number(left.hasSolution));

  for (const problem of pool.slice(0, count)) {
    selected.push({ problem, sourceType });
    usedProblemIds.add(problem.id);
  }
}

function normalizePracticeTask(row: PracticeTaskRawRow): WeakPracticeTask {
  const problem = normalizeProblem(row.problems);
  const questionType = normalizeQuestionType(problem?.question_types ?? null);

  return {
    id: row.id,
    practiceDate: row.practice_date,
    sourceType: row.source_type,
    status: row.status,
    result: row.result,
    completedAt: row.completed_at,
    problem: problem
      ? {
          id: problem.id,
          rawLatex: problem.raw_latex,
          answer: problem.answer,
          analysis: problem.analysis,
          questionType
        }
      : null
  };
}

function normalizeProblem(value: PracticeTaskRawRow["problems"]) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function normalizeQuestionType(value: ProblemInfo["question_types"]) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function getOrCreateScore(map: Map<string, WeaknessScore>, questionTypeId: string) {
  const current = map.get(questionTypeId) ?? {
    questionTypeId,
    mistakeCount: 0,
    notMasteredCount: 0,
    recentMistakeCount: 0,
    score: 0
  };

  map.set(questionTypeId, current);

  return current;
}

function shuffle<T>(items: T[]) {
  return items
    .map((item) => ({ item, sortKey: Math.random() }))
    .sort((left, right) => left.sortKey - right.sortKey)
    .map(({ item }) => item);
}

function addDaysToDateKey(dateKey: string, offset: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + offset);

  return date.toISOString().slice(0, 10);
}
