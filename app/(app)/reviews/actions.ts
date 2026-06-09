"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const initialReviewRounds = [
  { days: 1, round: "day1" },
  { days: 3, round: "day3" },
  { days: 7, round: "day7" },
  { days: 14, round: "day14" },
  { days: 30, round: "day30" }
] as const;

const retryReviewRounds = [
  { days: 3, round: "retry_day3" },
  { days: 7, round: "retry_day7" }
] as const;

export async function createReviewTasksForMistake(mistakeId: string) {
  const admin = createAdminClient();
  const { data: mistake, error: mistakeError } = await admin
    .from("mistakes")
    .select("id, user_id, question_type_id, classification_status, created_at")
    .eq("id", mistakeId)
    .single();

  if (mistakeError) {
    return {
      ok: false,
      message: `load mistake failed: ${mistakeError.message}`
    };
  }

  if (
    !mistake.question_type_id ||
    !["student_selected", "teacher_confirmed"].includes(
      mistake.classification_status
    )
  ) {
    return {
      ok: true,
      message: "mistake is not ready for review tasks"
    };
  }

  const { count, error: countError } = await admin
    .from("review_tasks")
    .select("id", { count: "exact", head: true })
    .eq("mistake_id", mistake.id);

  if (countError) {
    return {
      ok: false,
      message: `check existing review tasks failed: ${countError.message}`
    };
  }

  if ((count ?? 0) > 0) {
    return {
      ok: true,
      message: "review tasks already exist"
    };
  }

  const { error: insertError } = await admin.from("review_tasks").insert(
    initialReviewRounds.map((item) => ({
      user_id: mistake.user_id,
      mistake_id: mistake.id,
      question_type_id: mistake.question_type_id,
      interval_days: item.days,
      due_date: addDays(mistake.created_at, item.days),
      review_date: addDays(mistake.created_at, item.days),
      review_round: item.round,
      status: "pending"
    }))
  );

  if (insertError) {
    return {
      ok: false,
      message: `insert review tasks failed: ${insertError.message}`
    };
  }

  return {
    ok: true,
    message: "review tasks created"
  };
}

export async function completeReviewTask(formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "").trim();
  const result = normalizeReviewResult(formData.get("result"));

  if (!taskId || !result) {
    redirect(withMessage("/reviews", "缺少复习任务或复习结果"));
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: task, error: taskError } = await supabase
    .from("review_tasks")
    .select("id, user_id, mistake_id, question_type_id, review_date")
    .eq("id", taskId)
    .eq("user_id", user.id)
    .single();

  if (taskError) {
    redirect(
      `/reviews?message=${encodeURIComponent(`读取复习任务失败：${taskError.message}`)}`
    );
  }

  const { error: updateError } = await supabase
    .from("review_tasks")
    .update({
      status: "completed",
      result,
      completed_at: new Date().toISOString()
    })
    .eq("id", task.id)
    .eq("user_id", user.id);

  if (updateError) {
    redirect(
      `/reviews?message=${encodeURIComponent(`更新复习任务失败：${updateError.message}`)}`
    );
  }

  if (result === "not_mastered") {
    const { error: retryError } = await supabase.from("review_tasks").insert(
      retryReviewRounds.map((item) => ({
        user_id: task.user_id,
        mistake_id: task.mistake_id,
        question_type_id: task.question_type_id,
        interval_days: item.days,
        due_date: addDays(new Date().toISOString(), item.days),
        review_date: addDays(new Date().toISOString(), item.days),
        review_round: item.round,
        status: "pending"
      }))
    );

    if (retryError) {
      redirect(
        `/reviews?message=${encodeURIComponent(
          `当前任务已完成，但追加复习任务失败：${retryError.message}`
        )}`
      );
    }
  }

  revalidatePath("/reviews");
  revalidatePath("/mistakes");
  redirect(withMessage("/reviews", "复习记录已更新"));
}

function normalizeReviewResult(value: FormDataEntryValue | null) {
  return value === "mastered" || value === "not_mastered" ? value : null;
}

function addDays(dateValue: string, days: number) {
  const date = new Date(dateValue);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function withMessage(path: string, message: string) {
  return `${path}?message=${encodeURIComponent(message)}`;
}
