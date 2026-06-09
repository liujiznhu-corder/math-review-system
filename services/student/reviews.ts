import { createClient } from "@/lib/supabase/server";

export type TodayReviewTask = {
  id: string;
  reviewDate: string;
  reviewRound: string;
  mistake: {
    id: string;
    stem: string;
    rawText: string | null;
    rawLatex: string | null;
    latexContent: string | null;
    displayLatex: string;
    inputType: "plain_text" | "latex";
    note: string | null;
    hasAnswerContent: boolean;
    questionType: {
      level1: string;
      level2: string;
      level3: string;
    } | null;
  } | null;
};

type ReviewTaskRow = {
  id: string;
  review_date: string;
  review_round: string;
  mistakes:
    | {
        id: string;
        stem: string;
        raw_text: string | null;
        raw_latex: string | null;
        latex_content: string | null;
        input_type: "plain_text" | "latex";
        note: string | null;
        answer: string | null;
        analysis: string | null;
        question_types:
          | {
              level1: string;
              level2: string;
              level3: string;
            }
          | {
              level1: string;
              level2: string;
              level3: string;
            }[]
          | null;
      }
    | {
        id: string;
        stem: string;
        raw_text: string | null;
        raw_latex: string | null;
        latex_content: string | null;
        input_type: "plain_text" | "latex";
        note: string | null;
        answer: string | null;
        analysis: string | null;
        question_types:
          | {
              level1: string;
              level2: string;
              level3: string;
            }
          | {
              level1: string;
              level2: string;
              level3: string;
            }[]
          | null;
      }[]
    | null;
};

type ProblemSolutionRow = {
  source_mistake_id: string | null;
  answer: string | null;
  analysis: string | null;
};

export async function getTodayReviewTasks(
  userId?: string
): Promise<TodayReviewTask[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  let query = supabase
    .from("review_tasks")
    .select(
      "id, review_date, review_round, mistakes(id, stem, raw_text, raw_latex, latex_content, input_type, note, answer, analysis, question_types(level1, level2, level3))"
    )
    .eq("status", "pending")
    .lte("review_date", today)
    .order("review_date", { ascending: true });

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const rows = ((data ?? []) as unknown as ReviewTaskRow[]) ?? [];
  const solutionMap = await getProblemSolutionMap(
    rows
      .map((row) => normalizeMistake(row.mistakes)?.id)
      .filter((id): id is string => Boolean(id))
  );

  return rows.map((row) => normalizeReviewTask(row, solutionMap));
}

export async function getCompletedTodayCount(userId?: string) {
  const supabase = await createClient();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  let query = supabase
    .from("review_tasks")
    .select("id", { count: "exact", head: true })
    .eq("status", "completed")
    .gte("completed_at", startOfToday.toISOString());

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { count } = await query;

  return count ?? 0;
}

async function getProblemSolutionMap(mistakeIds: string[]) {
  if (mistakeIds.length === 0) {
    return new Map<string, ProblemSolutionRow>();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("problems")
    .select("source_mistake_id, answer, analysis")
    .in("source_mistake_id", Array.from(new Set(mistakeIds)));

  if (error) {
    throw new Error(error.message);
  }

  return new Map(
    ((data ?? []) as ProblemSolutionRow[])
      .filter((row) => Boolean(row.source_mistake_id))
      .map((row) => [row.source_mistake_id as string, row])
  );
}

function normalizeReviewTask(
  row: ReviewTaskRow,
  solutionMap: Map<string, ProblemSolutionRow>
): TodayReviewTask {
  const mistake = normalizeMistake(row.mistakes);
  const questionType = mistake
    ? Array.isArray(mistake.question_types)
      ? (mistake.question_types[0] ?? null)
      : mistake.question_types
    : null;
  const problemSolution = mistake ? solutionMap.get(mistake.id) : null;

  return {
    id: row.id,
    reviewDate: row.review_date,
    reviewRound: row.review_round,
    mistake: mistake
      ? {
          id: mistake.id,
          stem: mistake.stem,
          rawText: mistake.raw_text,
          rawLatex: mistake.raw_latex,
          latexContent: mistake.latex_content,
          displayLatex:
            mistake.raw_latex ??
            mistake.latex_content ??
            mistake.raw_text ??
            mistake.stem,
          inputType: mistake.input_type,
          note: mistake.note,
          hasAnswerContent:
            hasContent(mistake.answer) ||
            hasContent(mistake.analysis) ||
            hasContent(problemSolution?.answer) ||
            hasContent(problemSolution?.analysis),
          questionType
        }
      : null
  };
}

function normalizeMistake(value: ReviewTaskRow["mistakes"]) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function hasContent(value: string | null | undefined) {
  return Boolean(value?.trim());
}
