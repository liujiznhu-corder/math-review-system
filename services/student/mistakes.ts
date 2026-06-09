import { createClient } from "@/lib/supabase/server";
import type { ClassifierQuestionType } from "@/services/classifier";
import type { Database } from "@/types/database";

export type StudentMistakeQuestionType = Pick<
  Database["public"]["Tables"]["question_types"]["Row"],
  "id" | "level1" | "level2" | "level3"
>;

export type SelectableQuestionType = StudentMistakeQuestionType;

export type StudentMistakeListItem = Pick<
  Database["public"]["Tables"]["mistakes"]["Row"],
  | "id"
  | "stem"
  | "created_at"
  | "question_type_id"
  | "input_type"
  | "raw_text"
  | "raw_latex"
  | "latex_content"
  | "classification_status"
> & {
  question_types: StudentMistakeQuestionType | null;
};

type MistakeRawRow = Omit<StudentMistakeListItem, "question_types"> & {
  question_types:
    | StudentMistakeQuestionType
    | StudentMistakeQuestionType[]
    | null;
};

type QuestionTypeFromDb = {
  id: string;
  level1: string;
  level2: string;
  level3: string;
  keywords: string[] | null;
  question_type_examples: {
    id: string;
    example_text: string;
  }[];
};

export async function getStudentMistakesPageData(
  questionTypeId: string,
  userId?: string
) {
  const supabase = await createClient();
  const [{ data: questionTypes }, mistakesResult] = await Promise.all([
    supabase
      .from("question_types")
      .select("id, level1, level2, level3")
      .eq("is_active", true)
      .order("level1", { ascending: true })
      .order("level2", { ascending: true })
      .order("level3", { ascending: true }),
    getStudentMistakes(questionTypeId, userId)
  ]);

  return {
    questionTypes: (questionTypes ?? []) as StudentMistakeQuestionType[],
    mistakes: normalizeMistakes(
      (mistakesResult.data ?? []) as unknown as MistakeRawRow[]
    ),
    error: mistakesResult.error
  };
}

export async function getStudentSelectableQuestionTypes() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("question_types")
    .select("id, level1, level2, level3")
    .eq("is_active", true)
    .order("level1", { ascending: true })
    .order("level2", { ascending: true })
    .order("level3", { ascending: true });

  return (data ?? []) as SelectableQuestionType[];
}

export async function getStudentClassifierQuestionTypes() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("question_types")
    .select(
      "id, level1, level2, level3, keywords, question_type_examples(id, example_text)"
    )
    .eq("is_active", true)
    .order("level1", { ascending: true })
    .order("level2", { ascending: true })
    .order("level3", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as QuestionTypeFromDb[]).map(
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
}

async function getStudentMistakes(questionTypeId: string, userId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("mistakes")
    .select(
      "id, stem, created_at, question_type_id, input_type, raw_text, raw_latex, latex_content, classification_status, question_types(id, level1, level2, level3)"
    )
    .order("created_at", { ascending: false });

  if (questionTypeId) {
    query = query.eq("question_type_id", questionTypeId);
  }

  if (userId) {
    query = query.eq("user_id", userId);
  }

  return query;
}

function normalizeMistakes(rows: MistakeRawRow[]): StudentMistakeListItem[] {
  return rows.map((row) => ({
    ...row,
    question_types: Array.isArray(row.question_types)
      ? (row.question_types[0] ?? null)
      : row.question_types
  }));
}
