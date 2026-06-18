"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createReviewTasksForMistake } from "@/app/(app)/reviews/actions";
import { canManageQuestionTypes, normalizeRole } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { normalizeLatexProblem } from "@/services/latex-normalizer";

type ProblemType = "single_choice" | "fill_blank" | "calculation";

export async function confirmMistakeQuestionType(formData: FormData) {
  const mistakeId = String(formData.get("mistakeId") ?? "").trim();
  const questionTypeId = String(formData.get("questionTypeId") ?? "").trim();
  const teacherNote = normalizeOptionalString(formData.get("teacherNote"));
  const problemType = normalizeProblemType(formData.get("problemType"));
  const rawLatex = String(formData.get("rawLatex") ?? "");
  const returnTo = normalizeReturnTo(formData.get("returnTo"));
  const normalizedProblem = rawLatex.trim()
    ? normalizeLatexProblem(rawLatex)
    : null;

  if (!mistakeId || !questionTypeId) {
    redirect(withMessage(returnTo, "请选择错题和三级题型。"));
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
      withMessage(
        returnTo,
        `查询当前用户角色失败：${formatSupabaseError(profileError)}`
      )
    );
  }

  const role = normalizeRole(profile?.role);

  if (!canManageQuestionTypes(role)) {
    redirect(withMessage(returnTo, "当前账号不能审核错题。"));
  }

  const admin = createAdminClient();
  const { data: updatedMistake, error: updateError } = await admin
    .from("mistakes")
    .update({
      question_type_id: questionTypeId,
      classification_status: "teacher_confirmed",
      classified_by: "teacher",
      teacher_note: teacherNote,
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
    .select("id")
    .single();

  if (updateError) {
    redirect(
      withMessage(returnTo, `update mistakes failed: ${formatSupabaseError(updateError)}`)
    );
  }

  const reviewTaskResult = await createReviewTasksForMistake(
    updatedMistake.id
  );

  if (!reviewTaskResult.ok) {
    revalidatePath("/teacher/review-mistakes");
    revalidatePath("/reviews");
    redirect(
      withMessage(
        returnTo,
        `update mistakes succeeded, insert review_tasks failed: ${reviewTaskResult.message}`
      )
    );
  }

  revalidatePath("/teacher/review-mistakes");
  revalidatePath("/teacher/solutions");
  revalidatePath("/reviews");
  redirect(withMessage(returnTo, "已确认题型，可继续审核下一道错题。"));
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

function normalizeReturnTo(value: FormDataEntryValue | null) {
  const fallback = "/teacher/review-mistakes";
  const raw = String(value ?? "").trim();

  if (!raw) {
    return fallback;
  }

  try {
    const url = new URL(raw, "http://localhost");

    if (url.pathname !== "/teacher/review-mistakes") {
      return fallback;
    }

    url.searchParams.delete("message");

    return `${url.pathname}${url.search}`;
  } catch {
    return fallback;
  }
}

function withMessage(path: string, message: string) {
  const url = new URL(path, "http://localhost");
  url.searchParams.set("message", message);

  return `${url.pathname}${url.search}`;
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
