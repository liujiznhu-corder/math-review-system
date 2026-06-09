"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { canManageQuestionTypes, normalizeRole } from "@/lib/roles";
import { createReviewTasksForMistake } from "@/app/(app)/reviews/actions";
import { normalizeLatexProblem } from "@/services/latex-normalizer";

type ProblemType = "single_choice" | "fill_blank" | "calculation";

export async function confirmMistakeQuestionType(formData: FormData) {
  const mistakeId = String(formData.get("mistakeId") ?? "").trim();
  const questionTypeId = String(formData.get("questionTypeId") ?? "").trim();
  const teacherNote = normalizeOptionalString(formData.get("teacherNote"));
  const answer = normalizeOptionalString(formData.get("answer"));
  const analysis = normalizeOptionalString(formData.get("analysis"));
  const problemType = normalizeProblemType(formData.get("problemType"));
  const rawLatex = String(formData.get("rawLatex") ?? "");
  const normalizedProblem = rawLatex.trim()
    ? normalizeLatexProblem(rawLatex)
    : null;

  if (!mistakeId || !questionTypeId) {
    redirect(withMessage("/teacher/review-mistakes", "请选择错题和题型"));
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    redirect(
      `/teacher/review-mistakes?message=${encodeURIComponent(
        `查询当前用户角色失败：${formatSupabaseError(profileError)}`
      )}`
    );
  }

  const role = normalizeRole(profile?.role);

  if (!canManageQuestionTypes(role)) {
    redirect(withMessage("/teacher/review-mistakes", "当前账号不能审核错题"));
  }

  const admin = createAdminClient();
  const { data: updatedMistake, error: updateError } = await admin
    .from("mistakes")
    .update({
      question_type_id: questionTypeId,
      classification_status: "teacher_confirmed",
      classified_by: "teacher",
      teacher_note: teacherNote,
      answer,
      analysis,
      problem_type: problemType,
      raw_latex: rawLatex.trim() ? rawLatex : null,
      normalized_stem: normalizedProblem?.plainText ?? null,
      options_json:
        problemType === "single_choice" && normalizedProblem?.options
          ? normalizedProblem.options
          : null
    })
    .eq("id", mistakeId)
    .eq("classification_status", "pending")
    .select(
      "id, user_id, question_type_id, problem_type, raw_latex, latex_content, stem, normalized_stem, normalized_text, options_json, answer, analysis, source, created_at, updated_at"
    )
    .single();

  if (updateError) {
    redirect(
      `/teacher/review-mistakes?message=${encodeURIComponent(
        `update mistakes failed: ${formatSupabaseError(updateError)}`
      )}`
    );
  }

  const solutionResult = await upsertStudentSubmittedProblem(updatedMistake);

  if (!solutionResult.ok) {
    revalidatePath("/teacher/review-mistakes");
    redirect(
      `/teacher/review-mistakes?message=${encodeURIComponent(
        `update mistakes succeeded, create solution problem failed: ${solutionResult.message}`
      )}`
    );
  }

  const reviewTaskResult = await createReviewTasksForMistake(updatedMistake.id);

  if (!reviewTaskResult.ok) {
    revalidatePath("/teacher/review-mistakes");
    revalidatePath("/reviews");
    redirect(
      `/teacher/review-mistakes?message=${encodeURIComponent(
        `update mistakes succeeded, insert review_tasks failed: ${reviewTaskResult.message}`
      )}`
    );
  }

  revalidatePath("/teacher/review-mistakes");
  revalidatePath("/teacher/solutions");
  revalidatePath("/reviews");
  redirect(
    withMessage(
      "/teacher/review-mistakes",
      "update mistakes succeeded, insert review_tasks succeeded"
    )
  );
}

async function upsertStudentSubmittedProblem(mistake: {
  id: string;
  user_id: string;
  question_type_id: string | null;
  problem_type: ProblemType;
  raw_latex: string | null;
  latex_content: string | null;
  stem: string;
  normalized_stem: string | null;
  normalized_text?: string | null;
  options_json: unknown;
  answer: string | null;
  analysis: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}) {
  const admin = createAdminClient();
  const rawLatex = mistake.raw_latex || mistake.latex_content || mistake.stem;
  const normalizedText =
    mistake.normalized_stem ?? mistake.normalized_text ?? mistake.stem;
  const { error } = await admin.from("problems").upsert(
    {
      created_by: mistake.user_id,
      question_type_id: mistake.question_type_id,
      problem_type: mistake.problem_type,
      raw_latex: rawLatex,
      normalized_text: normalizedText,
      options_json: mistake.options_json,
      answer: mistake.answer,
      analysis: mistake.analysis,
      source: mistake.source,
      source_type: "student_submitted",
      source_mistake_id: mistake.id,
      created_at: mistake.created_at,
      updated_at: mistake.updated_at
    },
    {
      onConflict: "source_mistake_id"
    }
  );

  if (error) {
    return {
      ok: false,
      message: formatSupabaseError(error)
    };
  }

  return {
    ok: true,
    message: "solution problem upserted"
  };
}

function normalizeOptionalString(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
}

function normalizeProblemType(value: FormDataEntryValue | null): ProblemType {
  if (value === "single_choice" || value === "fill_blank") {
    return value;
  }

  return "calculation";
}

function withMessage(path: string, message: string) {
  return `${path}?message=${encodeURIComponent(message)}`;
}

function formatSupabaseError(error: {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}) {
  return [
    error.message,
    error.code ? `code=${error.code}` : null,
    error.details ? `details=${error.details}` : null,
    error.hint ? `hint=${error.hint}` : null
  ]
    .filter(Boolean)
    .join(" | ");
}
