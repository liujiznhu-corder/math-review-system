"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canManageQuestionTypes, getCurrentUserRole } from "@/lib/roles";

type QuestionTypePayload = {
  id: string | null;
  level1: string;
  level2: string;
  level3: string;
  keywords: string[];
  examples: string[];
  description: string | null;
};

export async function saveQuestionType(formData: FormData) {
  const payload = parseQuestionTypePayload(formData);
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await requireQuestionTypeManager();

  if (!payload.level1 || !payload.level2 || !payload.level3) {
    redirect(withMessage("/question-types", "请填写完整的一级、二级和三级题型"));
  }

  const questionTypeId = payload.id
    ? await updateQuestionType(payload)
    : await createQuestionType(payload);

  await replaceExamples(questionTypeId, payload.examples);

  revalidatePath("/question-types");
  redirect(withMessage("/question-types", "题型库已保存"));
}

export async function deleteQuestionType(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await requireQuestionTypeManager();

  if (!id) {
    redirect(withMessage("/question-types", "缺少题型 ID"));
  }

  const { error } = await supabase.from("question_types").delete().eq("id", id);

  if (error) {
    redirect(`/question-types?message=${encodeURIComponent(error.message)}`);
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
    keywords: splitLinesAndSeparators(String(formData.get("keywords") ?? "")),
    examples: splitExamples(String(formData.get("examples") ?? "")),
    description: normalizeOptionalString(formData.get("description"))
  };
}

async function createQuestionType(payload: QuestionTypePayload) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("question_types")
    .insert({
      level1: payload.level1,
      level2: payload.level2,
      level3: payload.level3,
      keywords: payload.keywords,
      description: payload.description
    })
    .select("id")
    .single();

  if (error) {
    redirect(`/question-types?message=${encodeURIComponent(error.message)}`);
  }

  return data.id;
}

async function updateQuestionType(payload: QuestionTypePayload) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("question_types")
    .update({
      level1: payload.level1,
      level2: payload.level2,
      level3: payload.level3,
      keywords: payload.keywords,
      description: payload.description
    })
    .eq("id", payload.id as string);

  if (error) {
    redirect(`/question-types?message=${encodeURIComponent(error.message)}`);
  }

  return payload.id as string;
}

async function replaceExamples(questionTypeId: string, examples: string[]) {
  const supabase = await createClient();
  const { error: deleteError } = await supabase
    .from("question_type_examples")
    .delete()
    .eq("question_type_id", questionTypeId);

  if (deleteError) {
    redirect(
      `/question-types?message=${encodeURIComponent(deleteError.message)}`
    );
  }

  if (examples.length === 0) {
    return;
  }

  const { error: insertError } = await supabase
    .from("question_type_examples")
    .insert(
      examples.map((exampleText) => ({
        question_type_id: questionTypeId,
        example_text: exampleText
      }))
    );

  if (insertError) {
    redirect(
      `/question-types?message=${encodeURIComponent(insertError.message)}`
    );
  }
}

function normalizeOptionalString(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
}

function splitLinesAndSeparators(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,，、;；]/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function splitExamples(value: string) {
  return value
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function withMessage(path: string, message: string) {
  return `${path}?message=${encodeURIComponent(message)}`;
}

async function requireQuestionTypeManager() {
  const role = await getCurrentUserRole();

  if (!canManageQuestionTypes(role)) {
    redirect(withMessage("/mistakes/new", "当前账号不能管理题型库"));
  }
}
