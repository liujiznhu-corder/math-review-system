"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canManageQuestionTypes, getCurrentUserRole } from "@/lib/roles";
import { normalizeLatexProblem } from "@/services/latex-normalizer";

type ProblemType = "single_choice" | "fill_blank" | "calculation";

export async function updateProblem(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const problemType = normalizeProblemType(formData.get("problemType"));
  const rawLatex = String(formData.get("rawLatex") ?? "");
  const questionTypeId = normalizeOptionalString(formData.get("questionTypeId"));
  const source = normalizeOptionalString(formData.get("source"));
  const answer = normalizeOptionalString(formData.get("answer"));
  const analysis = normalizeOptionalString(formData.get("analysis"));

  await requireProblemManager();

  if (!id) {
    redirect(withMessage("/teacher/problems", "缺少题目 ID"));
  }

  if (!rawLatex.trim()) {
    redirect(withMessage("/teacher/problems", "raw_latex 不能为空"));
  }

  const normalized = normalizeLatexProblem(rawLatex);
  const supabase = await createClient();
  const { error } = await supabase
    .from("problems")
    .update({
      problem_type: problemType,
      raw_latex: rawLatex,
      normalized_text: normalized.plainText,
      options_json:
        problemType === "single_choice" && normalized.options
          ? normalized.options
          : null,
      source,
      answer,
      analysis,
      question_type_id: questionTypeId
    })
    .eq("id", id);

  if (error) {
    redirect(
      `/teacher/problems?message=${encodeURIComponent(
        `更新失败：${formatSupabaseError(error)}`
      )}`
    );
  }

  revalidatePath("/teacher/problems");
  redirect(withMessage("/teacher/problems", "题目已更新"));
}

export async function deleteProblem(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();

  await requireProblemManager();

  if (!id) {
    redirect(withMessage("/teacher/problems", "缺少题目 ID"));
  }

  const supabase = await createClient();
  const { error } = await supabase.from("problems").delete().eq("id", id);

  if (error) {
    redirect(
      `/teacher/problems?message=${encodeURIComponent(
        `删除失败：${formatSupabaseError(error)}`
      )}`
    );
  }

  revalidatePath("/teacher/problems");
  redirect(withMessage("/teacher/problems", "题目已删除"));
}

async function requireProblemManager() {
  const role = await getCurrentUserRole();

  if (!canManageQuestionTypes(role)) {
    redirect(withMessage("/mistakes/new", "当前账号不能管理教师题库"));
  }
}

function normalizeProblemType(value: FormDataEntryValue | null): ProblemType {
  if (value === "single_choice" || value === "fill_blank") {
    return value;
  }

  return "calculation";
}

function normalizeOptionalString(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
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
