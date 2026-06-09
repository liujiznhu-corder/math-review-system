"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canManageQuestionTypes, getCurrentUserRole } from "@/lib/roles";
import { normalizeLatexProblem } from "@/services/latex-normalizer";

type ProblemType = "single_choice" | "fill_blank" | "calculation";

export async function saveProblem(formData: FormData) {
  const problemType = normalizeProblemType(formData.get("problemType"));
  const rawLatex = String(formData.get("rawLatex") ?? "");
  const questionTypeId = normalizeOptionalString(formData.get("questionTypeId"));
  const source = normalizeOptionalString(formData.get("source"));

  if (!(await canCurrentUserManageProblems())) {
    redirect(withMessage("/mistakes/new", "当前账号不能录入教师题目"));
  }

  if (!rawLatex.trim()) {
    redirect(withMessage("/teacher/problems/new", "请填写原始 LaTeX 题目代码"));
  }

  const normalized = normalizeLatexProblem(rawLatex);
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("problems").insert({
    created_by: user?.id,
    problem_type: problemType,
    raw_latex: rawLatex,
    normalized_text: normalized.plainText,
    options_json:
      problemType === "single_choice" && normalized.options
        ? normalized.options
        : null,
    source,
    question_type_id: questionTypeId,
    source_type: "teacher_created"
  });

  if (error) {
    redirect(
      `/teacher/problems/new?message=${encodeURIComponent(
        `保存失败：${formatSupabaseError(error)}`
      )}`
    );
  }

  revalidatePath("/teacher/problems");
  redirect(withMessage("/teacher/problems", "题目已保存"));
}

async function canCurrentUserManageProblems() {
  const role = await getCurrentUserRole();
  return canManageQuestionTypes(role);
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
