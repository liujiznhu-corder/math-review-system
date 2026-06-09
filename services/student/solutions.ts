import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type QuestionTypeRow = Pick<
  Database["public"]["Tables"]["question_types"]["Row"],
  "id" | "level1" | "level2" | "level3"
>;

export type StudentMistakeAnswer = Pick<
  Database["public"]["Tables"]["mistakes"]["Row"],
  | "id"
  | "user_id"
  | "stem"
  | "input_type"
  | "raw_text"
  | "raw_latex"
  | "latex_content"
  | "answer"
  | "analysis"
  | "teacher_note"
  | "created_at"
  | "classification_status"
> & {
  question_types: QuestionTypeRow | QuestionTypeRow[] | null;
};

export type StudentProblemSolution = Pick<
  Database["public"]["Tables"]["problems"]["Row"],
  "id" | "source_mistake_id" | "answer" | "analysis" | "updated_at"
>;

export async function getStudentMistakeAnswerData({
  mistakeId,
  userId,
  canManage
}: {
  mistakeId: string;
  userId: string;
  canManage: boolean;
}) {
  const mistake = canManage
    ? await getMistakeForTeacher(mistakeId)
    : await getMistakeForStudent(mistakeId, userId);

  if (!mistake) {
    return null;
  }

  const questionType = normalizeQuestionType(mistake.question_types);
  const solution = await getProblemSolution(mistake.id);
  const answer = solution?.answer ?? mistake.answer;
  const analysis = solution?.analysis ?? mistake.analysis;

  return {
    mistake,
    questionType,
    solution,
    answer,
    analysis,
    hasAnswerContent: Boolean(answer?.trim() || analysis?.trim())
  };
}

async function getMistakeForStudent(id: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mistakes")
    .select(
      "id, user_id, stem, input_type, raw_text, raw_latex, latex_content, answer, analysis, teacher_note, created_at, classification_status, question_types(id, level1, level2, level3)"
    )
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  return (data as unknown as StudentMistakeAnswer | null) ?? null;
}

async function getMistakeForTeacher(id: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("mistakes")
    .select(
      "id, user_id, stem, input_type, raw_text, raw_latex, latex_content, answer, analysis, teacher_note, created_at, classification_status, question_types(id, level1, level2, level3)"
    )
    .eq("id", id)
    .maybeSingle();

  return (data as unknown as StudentMistakeAnswer | null) ?? null;
}

async function getProblemSolution(mistakeId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("problems")
    .select("id, source_mistake_id, answer, analysis, updated_at")
    .eq("source_mistake_id", mistakeId)
    .maybeSingle();

  return (data as StudentProblemSolution | null) ?? null;
}

function normalizeQuestionType(
  value: StudentMistakeAnswer["question_types"]
): QuestionTypeRow | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}
