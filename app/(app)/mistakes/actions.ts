"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  classifyQuestion,
  type ClassifierQuestionType
} from "@/services/classifier";
import {
  getClassificationText,
  type MistakeInputType
} from "@/services/latex";
import { normalizeLatexProblem } from "@/services/latex-normalizer";
import { createReviewTasksForMistake } from "@/app/(app)/reviews/actions";

export type RecommendedQuestionType = {
  questionTypeId: string;
  level1: string;
  level2: string;
  level3: string;
  score: number;
  reasons: string[];
};

export type SelectableQuestionType = {
  id: string;
  level1: string;
  level2: string;
  level3: string;
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

export async function recommendQuestionTypes({
  inputType,
  rawText,
  latexContent
}: {
  inputType: MistakeInputType;
  rawText: string;
  latexContent: string;
}): Promise<RecommendedQuestionType[]> {
  const classificationText = getClassificationText({
    inputType,
    rawText,
    latexContent
  });

  if (!classificationText) {
    return [];
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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

  const questionTypes = ((data ?? []) as QuestionTypeFromDb[]).map(
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
    questionTypes.map((questionType) => [questionType.id, questionType])
  );

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
      questionTypeId: questionType.id,
      level1: questionType.level1,
      level2: questionType.level2,
      level3: questionType.level3,
      score: Number(result.score.toFixed(2)),
      reasons: result.reasons
    };
  });
}

export async function saveMistake(formData: FormData) {
  const inputType = normalizeInputType(formData.get("inputType"));
  const rawText = String(formData.get("rawText") ?? "").trim();
  const latexContent = String(formData.get("latexContent") ?? "").trim();
  const stem = getClassificationText({
    inputType,
    rawText,
    latexContent
  });
  const normalizedProblem =
    inputType === "latex" ? normalizeLatexProblem(latexContent) : null;
  const note = normalizeOptionalString(formData.get("note"));
  const questionTypeId = String(formData.get("questionTypeId") ?? "").trim();
  const intent = String(formData.get("intent") ?? "save");
  const submitForReview = intent === "submit_review";

  if (!stem) {
    redirect(withMessage("/mistakes/new", "请先输入题干"));
  }

  if (!submitForReview && !questionTypeId) {
    redirect(withMessage("/mistakes/new", "请选择一个推荐题型"));
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: mistake, error } = await supabase
    .from("mistakes")
    .insert({
      stem,
      problem_type: "calculation",
      input_type: inputType,
      raw_text: inputType === "latex" ? stem : rawText,
      raw_latex: inputType === "latex" ? latexContent : null,
      normalized_stem: inputType === "latex" ? normalizedProblem?.plainText : stem,
      options_json:
        inputType === "latex" && normalizedProblem?.options
          ? normalizedProblem.options
          : null,
      latex_content: inputType === "latex" ? latexContent : null,
      note,
      question_type_id: submitForReview ? null : questionTypeId,
      classification_status: submitForReview ? "pending" : "student_selected",
      classified_by: submitForReview ? null : "student"
    })
    .select("id")
    .single();

  if (error) {
    redirect(`/mistakes/new?message=${encodeURIComponent(error.message)}`);
  }

  if (!submitForReview) {
    await createReviewTasksForMistake(mistake.id);
  }

  revalidatePath("/mistakes");
  revalidatePath("/reviews");
  redirect(
    withMessage(
      "/mistakes",
      submitForReview ? "错题已提交教师审核" : "错题已保存"
    )
  );
}

function normalizeOptionalString(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
}

function normalizeInputType(value: FormDataEntryValue | null): MistakeInputType {
  return value === "latex" ? "latex" : "plain_text";
}

function withMessage(path: string, message: string) {
  return `${path}?message=${encodeURIComponent(message)}`;
}
