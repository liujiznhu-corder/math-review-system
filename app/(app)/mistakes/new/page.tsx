import { MistakeEntryForm } from "./mistake-entry-form";
import { createClient } from "@/lib/supabase/server";
import { redirectTeacherToDashboard } from "@/lib/roles";
import type { SelectableQuestionType } from "@/app/(app)/mistakes/actions";

type NewMistakePageProps = {
  searchParams?: Promise<{
    message?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function NewMistakePage({
  searchParams
}: NewMistakePageProps) {
  await redirectTeacherToDashboard();

  const params = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("question_types")
    .select("id, level1, level2, level3")
    .eq("is_active", true)
    .order("level1", { ascending: true })
    .order("level2", { ascending: true })
    .order("level3", { ascending: true });
  const questionTypes = (data ?? []) as SelectableQuestionType[];

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8">
      <div>
        <p className="text-sm font-medium text-clay">错题录入</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">
          手动输入题干并推荐题型
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">
          当前不接 OCR 和 AI API。推荐逻辑仅使用题型库中的关键词与例题相似度，服务层后续可替换。
        </p>
      </div>

      <section className="mt-8">
        <MistakeEntryForm
          message={params?.message}
          questionTypes={questionTypes}
        />
      </section>
    </main>
  );
}
