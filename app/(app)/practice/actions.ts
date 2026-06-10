"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageQuestionTypes, getCurrentUserRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import {
  addPracticeMistakes,
  completePracticeRecord,
  createPracticeSession,
  StudentPracticeError
} from "@/services/student/practice";

export async function startPracticeSession(formData: FormData) {
  const questionTypeId = String(formData.get("questionTypeId") ?? "").trim();
  const userId = await getCurrentStudentId();

  if (!questionTypeId) {
    redirect(withMessage("/practice", "请先选择一个三级题型"));
  }

  let redirectPath = "/practice";

  try {
    const session = await createPracticeSession({
      userId,
      questionTypeId
    });
    const message = session.hasSupplementedProblems
      ? "该题型题量不足，已为你补充相近题型。"
      : "专项训练已开始。";

    revalidatePath("/practice");
    redirectPath = withMessage(`/practice/session/${session.id}`, message);
  } catch (error) {
    redirect(withMessage("/practice", getErrorMessage(error)));
  }

  redirect(redirectPath);
}

export async function completePracticeRecordAction(formData: FormData) {
  const recordId = String(formData.get("recordId") ?? "").trim();
  const sessionId = String(formData.get("sessionId") ?? "").trim();
  const result = normalizeResult(formData.get("result"));
  const userId = await getCurrentStudentId();

  if (!recordId || !sessionId || !result) {
    redirect(withMessage("/practice", "缺少训练记录或反馈结果"));
  }

  let redirectPath = withMessage(
    `/practice/session/${sessionId}`,
    "训练记录已更新"
  );

  try {
    await completePracticeRecord({
      userId,
      recordId,
      result
    });

    revalidatePath("/practice");
  } catch (error) {
    redirectPath = withMessage(
      `/practice/session/${sessionId}`,
      getErrorMessage(error)
    );
  }

  redirect(redirectPath);
}

export async function addPracticeMistakesAction(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "").trim();
  const recordIds = formData
    .getAll("recordIds")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const userId = await getCurrentStudentId();

  if (!sessionId) {
    redirect(withMessage("/practice", "缺少专项训练会话"));
  }

  let redirectPath = `/practice/session/${sessionId}/summary`;

  try {
    const result = await addPracticeMistakes({
      userId,
      sessionId,
      recordIds
    });
    const total = result.createdMistakes.length + result.skippedRecords.length;
    const message =
      total === 0
        ? "本次没有选中可加入错题库的未掌握题目。"
        : `已加入 ${result.createdMistakes.length} 题，跳过 ${result.skippedRecords.length} 题。`;

    revalidatePath("/practice");
    revalidatePath("/mistakes");
    revalidatePath("/reviews");
    revalidatePath("/dashboard");
    redirectPath = withMessage(`/practice/session/${sessionId}/summary`, message);
  } catch (error) {
    redirectPath = withMessage(
      `/practice/session/${sessionId}/summary`,
      getErrorMessage(error)
    );
  }

  redirect(redirectPath);
}

async function getCurrentStudentId() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = await getCurrentUserRole();

  if (canManageQuestionTypes(role)) {
    redirect("/teacher/dashboard");
  }

  return user.id;
}

function normalizeResult(value: FormDataEntryValue | null) {
  return value === "mastered" || value === "not_mastered" ? value : null;
}

function getErrorMessage(error: unknown) {
  if (error instanceof StudentPracticeError || error instanceof Error) {
    return error.message;
  }

  return "专项训练操作失败";
}

function withMessage(path: string, message: string) {
  const separator = path.includes("?") ? "&" : "?";

  return `${path}${separator}message=${encodeURIComponent(message)}`;
}
