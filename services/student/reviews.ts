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
    inputType: "plain_text" | "latex";
    note: string | null;
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

export async function getTodayReviewTasks(
  userId?: string
): Promise<TodayReviewTask[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  let query = supabase
    .from("review_tasks")
    .select(
      "id, review_date, review_round, mistakes(id, stem, raw_text, raw_latex, latex_content, input_type, note, question_types(level1, level2, level3))"
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

  return ((data ?? []) as unknown as ReviewTaskRow[]).map(normalizeReviewTask);
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

function normalizeReviewTask(row: ReviewTaskRow): TodayReviewTask {
  const mistake = Array.isArray(row.mistakes)
    ? (row.mistakes[0] ?? null)
    : row.mistakes;
  const questionType = mistake
    ? Array.isArray(mistake.question_types)
      ? (mistake.question_types[0] ?? null)
      : mistake.question_types
    : null;

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
          inputType: mistake.input_type,
          note: mistake.note,
          questionType
        }
      : null
  };
}
