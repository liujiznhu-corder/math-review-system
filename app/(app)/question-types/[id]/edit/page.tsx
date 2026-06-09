import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { QuestionTypeForm } from "@/components/question-types/QuestionTypeForm";
import {
  canManageQuestionTypes,
  getCurrentUserRole,
  redirectStudentToDashboard
} from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { updateQuestionType } from "../../actions";

type QuestionTypeRow = Database["public"]["Tables"]["question_types"]["Row"];
type ExampleRow = Pick<
  Database["public"]["Tables"]["question_type_examples"]["Row"],
  "id" | "example_text" | "solution_hint"
>;

type QuestionTypeWithExamples = QuestionTypeRow & {
  question_type_examples: ExampleRow[];
};

type EditQuestionTypePageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    message?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function EditQuestionTypePage({
  params,
  searchParams
}: EditQuestionTypePageProps) {
  await redirectStudentToDashboard();
  const role = await getCurrentUserRole();

  if (!canManageQuestionTypes(role)) {
    await redirectStudentToDashboard();
  }

  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("question_types")
    .select(
      "id, level1, level2, level3, keywords, description, is_active, created_by, created_at, updated_at, question_type_examples(id, example_text, solution_hint)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!data && !error) {
    notFound();
  }

  const questionType = data as QuestionTypeWithExamples | null;

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-8">
      <Link
        href="/question-types"
        className="inline-flex items-center gap-2 text-sm font-medium text-ink/65 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        返回题型库
      </Link>

      <div className="mt-6">
        <p className="text-sm font-medium text-clay">题型库</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">编辑题型</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">
          修改题型路径、识别特征、适用场景、代表例题和启用状态。
        </p>
      </div>

      {query?.message || error ? (
        <p className="mt-6 rounded-md border border-clay/30 bg-clay/10 px-4 py-3 text-sm text-clay">
          {query?.message ?? error?.message}
        </p>
      ) : null}

      {questionType ? (
        <section className="mt-8 rounded-md border border-ink/10 bg-white p-5 shadow-sm">
          <QuestionTypeForm
            action={updateQuestionType}
            questionType={{
              id: questionType.id,
              level1: questionType.level1,
              level2: questionType.level2,
              level3: questionType.level3,
              keywords: questionType.keywords,
              description: questionType.description,
              is_active: questionType.is_active,
              examples: questionType.question_type_examples
            }}
            submitLabel="保存修改"
          />
        </section>
      ) : null}
    </main>
  );
}
