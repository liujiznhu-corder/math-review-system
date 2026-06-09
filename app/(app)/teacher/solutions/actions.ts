"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageQuestionTypes, getCurrentUserRole } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateSolution(formData: FormData) {
  const problemId = String(formData.get("problemId") ?? "").trim();
  const answer = normalizeOptionalString(formData.get("answer"));
  const analysis = normalizeOptionalString(formData.get("analysis"));
  const role = await getCurrentUserRole();

  if (!canManageQuestionTypes(role)) {
    redirect("/dashboard");
  }

  if (!problemId) {
    redirect("/teacher/solutions");
  }

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
        `保存答案解析失败：${updateError.message}`
      )}`
    );
  }

  if (problem.source_mistake_id) {
    await admin
      .from("mistakes")
      .update({ answer, analysis })
      .eq("id", problem.source_mistake_id);
  }

  revalidatePath("/teacher/solutions");
  revalidatePath(`/teacher/solutions/${problemId}`);

  if (problem.source_mistake_id) {
    revalidatePath(`/mistakes/${problem.source_mistake_id}/answer`);
  }

  redirect(
    `/teacher/solutions/${problemId}?message=${encodeURIComponent(
      "答案解析已更新"
    )}`
  );
}

function normalizeOptionalString(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
}
