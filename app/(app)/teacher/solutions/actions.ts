"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageQuestionTypes, getCurrentUserRole } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";

type ProblemType = "single_choice" | "fill_blank" | "calculation";

export async function updateSolution(formData: FormData) {
  const solutionType = String(formData.get("solutionType") ?? "problem");
  const recordId = String(
    formData.get("recordId") ?? formData.get("problemId") ?? ""
  ).trim();
  const answer = normalizeOptionalString(formData.get("answer"));
  const analysis = normalizeOptionalString(formData.get("analysis"));

  await requireSolutionManager();

  if (!recordId) {
    redirect("/teacher/solutions");
  }

  if (solutionType === "mistake") {
    await updateMistakeSolution(recordId, answer, analysis);
    redirect(
      `/teacher/solutions/mistake_${recordId}?message=${encodeURIComponent(
        "答案解析已更新"
      )}`
    );
  }

  await updateProblemSolution(recordId, answer, analysis);
  redirect(
    `/teacher/solutions/${recordId}?message=${encodeURIComponent(
      "答案解析已更新"
    )}`
  );
}

export async function addMistakeToProblemLibrary(formData: FormData) {
  const mistakeId = String(formData.get("mistakeId") ?? "").trim();

  await requireSolutionManager();

  if (!mistakeId) {
    redirect(
      `/teacher/solutions?message=${encodeURIComponent("缺少错题 ID")}`
    );
  }

  const admin = createAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("problems")
    .select("id")
    .eq("source_mistake_id", mistakeId)
    .maybeSingle();

  if (existingError) {
    redirect(
      `/teacher/solutions?message=${encodeURIComponent(
        `检查题库失败：${formatSupabaseError(existingError)}`
      )}`
    );
  }

  if (existing) {
    redirect(
      `/teacher/solutions?message=${encodeURIComponent("这道题已加入题库")}`
    );
  }

  const { data: mistake, error: mistakeError } = await admin
    .from("mistakes")
    .select(
      "id, user_id, question_type_id, problem_type, raw_text, raw_latex, latex_content, stem, normalized_stem, options_json, answer, analysis, source, classification_status, created_at, updated_at"
    )
    .eq("id", mistakeId)
    .maybeSingle();

  if (mistakeError || !mistake) {
    redirect(
      `/teacher/solutions?message=${encodeURIComponent(
        mistakeError?.message ?? "错题不存在"
      )}`
    );
  }

  if (
    !mistake.question_type_id ||
    !["student_selected", "teacher_confirmed"].includes(
      mistake.classification_status
    )
  ) {
    redirect(
      `/teacher/solutions?message=${encodeURIComponent(
        "只有已确认题型的错题可以加入教师题库"
      )}`
    );
  }

  const rawLatex =
    mistake.raw_latex?.trim() ||
    mistake.latex_content?.trim() ||
    mistake.raw_text?.trim() ||
    mistake.stem;
  const { data: problem, error: insertError } = await admin
    .from("problems")
    .insert({
      created_by: mistake.user_id,
      question_type_id: mistake.question_type_id,
      problem_type: mistake.problem_type as ProblemType,
      raw_latex: rawLatex,
      normalized_text: mistake.normalized_stem ?? mistake.stem,
      options_json: mistake.options_json,
      answer: mistake.answer,
      analysis: mistake.analysis,
      source: mistake.source,
      source_type: "student_submitted",
      source_mistake_id: mistake.id,
      created_at: mistake.created_at,
      updated_at: mistake.updated_at
    })
    .select("id")
    .single();

  if (insertError || !problem) {
    redirect(
      `/teacher/solutions?message=${encodeURIComponent(
        `加入题库失败：${insertError ? formatSupabaseError(insertError) : "无返回记录"}`
      )}`
    );
  }

  revalidatePath("/teacher/solutions");
  revalidatePath("/teacher/problems");
  revalidatePath(`/mistakes/${mistakeId}/answer`);

  redirect(
    `/teacher/solutions/${problem.id}?message=${encodeURIComponent(
      "已加入教师题库"
    )}`
  );
}

async function updateProblemSolution(
  problemId: string,
  answer: string | null,
  analysis: string | null
) {
  const admin = createAdminClient();
  const { data: problem, error: loadError } = await admin
    .from("problems")
    .select("id, source_mistake_id")
    .eq("id", problemId)
    .maybeSingle();

  if (loadError || !problem) {
    redirect(
      `/teacher/solutions?message=${encodeURIComponent(
        loadError?.message ?? "题目不存在"
      )}`
    );
  }

  const { error: updateError } = await admin
    .from("problems")
    .update({ answer, analysis })
    .eq("id", problemId);

  if (updateError) {
    redirect(
      `/teacher/solutions/${problemId}?message=${encodeURIComponent(
        `保存答案解析失败：${formatSupabaseError(updateError)}`
      )}`
    );
  }

  if (problem.source_mistake_id) {
    const { error: mistakeUpdateError } = await admin
      .from("mistakes")
      .update({ answer, analysis })
      .eq("id", problem.source_mistake_id);

    if (mistakeUpdateError) {
      redirect(
        `/teacher/solutions/${problemId}?message=${encodeURIComponent(
          `答案已保存，但同步学生错题失败：${formatSupabaseError(
            mistakeUpdateError
          )}`
        )}`
      );
    }

    revalidatePath(`/mistakes/${problem.source_mistake_id}/answer`);
  }

  revalidatePath("/teacher/solutions");
  revalidatePath("/teacher/problems");
  revalidatePath(`/teacher/solutions/${problemId}`);
}

async function updateMistakeSolution(
  mistakeId: string,
  answer: string | null,
  analysis: string | null
) {
  const admin = createAdminClient();
  const { data: mistake, error: loadError } = await admin
    .from("mistakes")
    .select("id, classification_status")
    .eq("id", mistakeId)
    .maybeSingle();

  if (loadError || !mistake) {
    redirect(
      `/teacher/solutions?message=${encodeURIComponent(
        loadError?.message ?? "错题不存在"
      )}`
    );
  }

  if (!["student_selected", "teacher_confirmed"].includes(mistake.classification_status)) {
    redirect(
      `/teacher/solutions?message=${encodeURIComponent(
        "只有已确认题型的错题可以维护答案解析"
      )}`
    );
  }

  const { error: updateError } = await admin
    .from("mistakes")
    .update({ answer, analysis })
    .eq("id", mistakeId);

  if (updateError) {
    redirect(
      `/teacher/solutions/mistake_${mistakeId}?message=${encodeURIComponent(
        `保存答案解析失败：${formatSupabaseError(updateError)}`
      )}`
    );
  }

  revalidatePath("/teacher/solutions");
  revalidatePath(`/teacher/solutions/mistake_${mistakeId}`);
  revalidatePath(`/mistakes/${mistakeId}/answer`);
}

async function requireSolutionManager() {
  const role = await getCurrentUserRole();

  if (!canManageQuestionTypes(role)) {
    redirect("/dashboard");
  }
}

function normalizeOptionalString(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
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
