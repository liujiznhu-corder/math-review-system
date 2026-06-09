"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { completeWeakPracticeTask as completeWeakPracticeTaskService } from "@/services/weak-practice";

export async function completeWeakPracticeTask(formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "").trim();
  const result = normalizeResult(formData.get("result"));

  if (!taskId || !result) {
    redirect(withMessage("/weak-practice", "缺少训练任务或训练结果"));
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  try {
    await completeWeakPracticeTaskService({
      taskId,
      userId: user.id,
      result
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新训练任务失败";
    redirect(withMessage("/weak-practice", message));
  }

  revalidatePath("/weak-practice");
  revalidatePath("/dashboard");
  redirect(withMessage("/weak-practice", "薄弱巩固记录已更新"));
}

function normalizeResult(value: FormDataEntryValue | null) {
  return value === "mastered" || value === "not_mastered" ? value : null;
}

function withMessage(path: string, message: string) {
  return `${path}?message=${encodeURIComponent(message)}`;
}
