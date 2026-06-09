"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageQuestionTypes, getCurrentUserRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

type QuestionTypePayload = {
  id: string | null;
  level1: string;
  level2: string;
  level3: string;
  keywords: string[];
  examples: {
    exampleText: string;
    solutionHint: string | null;
  }[];
  description: string | null;
  isActive: boolean;
};

export async function createQuestionType(formData: FormData) {
  const payload = parseQuestionTypePayload(formData);
  await requireQuestionTypeManager();
  validateQuestionTypePayload(payload, "/question-types/new");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("question_types")
    .insert({
      level1: payload.level1,
      level2: payload.level2,
      level3: payload.level3,
      keywords: payload.keywords,
      description: payload.description,
      is_active: payload.isActive
    })
    .select("id")
    .single();

  if (error) {
    redirect(
      withMessage(
        "/question-types/new",
        `创建题型失败：${formatSupabaseError(error)}`
      )
    );
  }

  await replaceExamples(data.id, payload.examples, "/question-types/new");

  revalidatePath("/question-types");
  redirect(withMessage("/question-types", "题型已新增"));
}

export async function updateQuestionType(formData: FormData) {
  const payload = parseQuestionTypePayload(formData);
  await requireQuestionTypeManager();

  if (!payload.id) {
    redirect(withMessage("/question-types", "缺少题型 ID"));
  }

  const editPath = `/question-types/${payload.id}/edit`;
  validateQuestionTypePayload(payload, editPath);

  const supabase = await createClient();
  const { error } = await supabase
    .from("question_types")
    .update({
      level1: payload.level1,
      level2: payload.level2,
      level3: payload.level3,
      keywords: payload.keywords,
      description: payload.description,
      is_active: payload.isActive
    })
    .eq("id", payload.id);

  if (error) {
    redirect(
      withMessage(editPath, `更新题型失败：${formatSupabaseError(error)}`)
    );
  }

  await replaceExamples(payload.id, payload.examples, editPath);

  revalidatePath("/question-types");
  revalidatePath(editPath);
  redirect(withMessage("/question-types", "题型已更新"));
}

export async function deleteQuestionType(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  await requireQuestionTypeManager();

  if (!id) {
    redirect(withMessage("/question-types", "缺少题型 ID"));
  }

  const supabase = await createClient();
  const { error } = await supabase.from("question_types").delete().eq("id", id);

  if (error) {
    redirect(
      withMessage("/question-types", `删除题型失败：${formatSupabaseError(error)}`)
    );
  }

  revalidatePath("/question-types");
  redirect(withMessage("/question-types", "题型已删除"));
}

function parseQuestionTypePayload(formData: FormData): QuestionTypePayload {
  return {
    id: normalizeOptionalString(formData.get("id")),
    level1: String(formData.get("level1") ?? "").trim(),
    level2: String(formData.get("level2") ?? "").trim(),
    level3: String(formData.get("level3") ?? "").trim(),
    keywords: splitFeatureLines(String(formData.get("keywords") ?? "")),
    examples: parseExamples(formData),
    description: normalizeOptionalString(formData.get("description")),
    isActive: formData.get("isActive") === "true"
  };
}

function validateQuestionTypePayload(payload: QuestionTypePayload, path: string) {
  if (!payload.level1 || !payload.level2 || !payload.level3) {
    redirect(withMessage(path, "请填写完整的一级、二级和三级题型"));
  }
}

async function replaceExamples(
  questionTypeId: string,
  examples: QuestionTypePayload["examples"],
  errorPath: string
) {
  const supabase = await createClient();
  const { error: deleteError } = await supabase
    .from("question_type_examples")
    .delete()
    .eq("question_type_id", questionTypeId);

  if (deleteError) {
    redirect(
      withMessage(errorPath, `更新例题失败：${formatSupabaseError(deleteError)}`)
    );
  }

  if (examples.length === 0) {
    return;
  }

  const { error: insertError } = await supabase
    .from("question_type_examples")
    .insert(
      examples.map((example) => ({
        question_type_id: questionTypeId,
        example_text: example.exampleText,
        solution_hint: example.solutionHint
      }))
    );

  if (insertError) {
    redirect(
      withMessage(errorPath, `保存例题失败：${formatSupabaseError(insertError)}`)
    );
  }
}

function normalizeOptionalString(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
}

function splitFeatureLines(value: string) {
  return Array.from(
    new Set(
      value
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function parseExamples(formData: FormData): QuestionTypePayload["examples"] {
  const exampleTexts = formData
    .getAll("exampleText")
    .map((value) => String(value ?? "").trim());
  const solutionHints = formData
    .getAll("solutionHint")
    .map((value) => normalizeOptionalString(value));

  return exampleTexts
    .map((exampleText, index) => ({
      exampleText,
      solutionHint: solutionHints[index] ?? null
    }))
    .filter((example) => example.exampleText);
}

function withMessage(path: string, message: string) {
  return `${path}?message=${encodeURIComponent(message)}`;
}

async function requireQuestionTypeManager() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = await getCurrentUserRole();

  if (!canManageQuestionTypes(role)) {
    redirect(withMessage("/dashboard", "当前账号不能管理题型库"));
  }
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
