import { FilePenLine, Plus, Save, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { deleteQuestionType, saveQuestionType } from "./actions";
import type { Database } from "@/types/database";
import {
  canManageQuestionTypes,
  getCurrentUserRole,
  redirectStudentToDashboard
} from "@/lib/roles";

type QuestionTypeRow = Database["public"]["Tables"]["question_types"]["Row"];
type ExampleRow = Pick<
  Database["public"]["Tables"]["question_type_examples"]["Row"],
  "id" | "example_text"
>;

type QuestionTypeWithExamples = QuestionTypeRow & {
  question_type_examples: ExampleRow[];
};

type QuestionTypesPageProps = {
  searchParams?: Promise<{
    message?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function QuestionTypesPage({
  searchParams
}: QuestionTypesPageProps) {
  const params = await searchParams;
  await redirectStudentToDashboard();
  const role = await getCurrentUserRole();

  if (!canManageQuestionTypes(role)) {
    await redirectStudentToDashboard();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("question_types")
    .select(
      "id, level1, level2, level3, keywords, description, is_active, created_by, created_at, updated_at, question_type_examples(id, example_text)"
    )
    .order("level1", { ascending: true })
    .order("level2", { ascending: true })
    .order("level3", { ascending: true });

  const questionTypes = (data ?? []) as QuestionTypeWithExamples[];

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-clay">共享题型库</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">题型库管理</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">
            维护一级分类、二级分类、三级题型、关键词和例题。错题录入时会从数据库读取这里的数据进行匹配。
          </p>
        </div>
        <div className="rounded-md border border-ink/10 bg-white px-4 py-3 text-sm text-ink/70">
          当前题型：<span className="font-semibold text-ink">{questionTypes.length}</span>
        </div>
      </div>

      {params?.message ? (
        <p className="mt-6 rounded-md border border-moss/20 bg-white px-4 py-3 text-sm text-moss">
          {params.message}
        </p>
      ) : null}

      {error ? (
        <p className="mt-6 rounded-md border border-clay/30 bg-clay/10 px-4 py-3 text-sm text-clay">
          {error.message}
        </p>
      ) : null}

      <section className="mt-8 rounded-md border border-ink/10 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <Plus className="h-5 w-5 text-moss" />
          <h2 className="text-lg font-semibold text-ink">新增题型</h2>
        </div>
        <QuestionTypeForm submitLabel="新增题型" />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink">已有题型</h2>
        {questionTypes.length === 0 ? (
          <div className="mt-4 rounded-md border border-dashed border-ink/20 bg-white px-5 py-10 text-center text-sm text-ink/60">
            暂无题型。先新增一个三级题型和 2-3 道例题。
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-md border border-ink/10 bg-white">
            {questionTypes.map((questionType) => (
              <article
                key={questionType.id}
                className="border-b border-ink/10 p-5 last:border-b-0"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm text-ink/55">
                      {questionType.level1} / {questionType.level2}
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-ink">
                      {questionType.level3}
                    </h3>
                    {questionType.description ? (
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/65">
                        {questionType.description}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {questionType.keywords.map((keyword) => (
                        <span
                          key={keyword}
                          className="rounded-md bg-paper px-2 py-1 text-xs text-ink/70"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                  <form action={deleteQuestionType}>
                    <input type="hidden" name="id" value={questionType.id} />
                    <button
                      type="submit"
                      title="删除题型"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-clay/20 text-clay hover:bg-clay/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </div>

                {questionType.question_type_examples.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {questionType.question_type_examples.map((example, index) => (
                      <p
                        key={example.id}
                        className="rounded-md border border-ink/10 bg-paper px-3 py-2 text-sm leading-6 text-ink/75"
                      >
                        例题 {index + 1}：{example.example_text}
                      </p>
                    ))}
                  </div>
                ) : null}

                <details className="mt-4">
                  <summary className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-moss">
                    <FilePenLine className="h-4 w-4" />
                    编辑题型
                  </summary>
                  <div className="mt-4 rounded-md border border-ink/10 bg-paper p-4">
                    <QuestionTypeForm
                      questionType={questionType}
                      submitLabel="保存修改"
                    />
                  </div>
                </details>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function QuestionTypeForm({
  questionType,
  submitLabel
}: {
  questionType?: QuestionTypeWithExamples;
  submitLabel: string;
}) {
  return (
    <form action={saveQuestionType} className="grid gap-4">
      <input type="hidden" name="id" value={questionType?.id ?? ""} />
      <div className="grid gap-4 md:grid-cols-3">
        <TextField
          label="一级分类"
          name="level1"
          defaultValue={questionType?.level1}
          placeholder="高等数学"
          required
        />
        <TextField
          label="二级分类"
          name="level2"
          defaultValue={questionType?.level2}
          placeholder="一元函数微分学"
          required
        />
        <TextField
          label="三级题型"
          name="level3"
          defaultValue={questionType?.level3}
          placeholder="导数定义求极限"
          required
        />
      </div>
      <label className="block text-sm font-medium text-ink">
        关键词
        <textarea
          name="keywords"
          rows={3}
          defaultValue={questionType?.keywords.join("，")}
          placeholder="导数定义，极限，增量，f(x+h)-f(x)"
          className="mt-2 w-full rounded-md border border-ink/15 px-3 py-2 text-sm leading-6 outline-none focus:border-moss"
        />
      </label>
      <label className="block text-sm font-medium text-ink">
        例题
        <textarea
          name="examples"
          rows={5}
          defaultValue={questionType?.question_type_examples
            .map((example) => example.example_text)
            .join("\n\n")}
          placeholder={"每道例题之间空一行。\n例：已知 f'(x0) 定义式，求某极限。"}
          className="mt-2 w-full rounded-md border border-ink/15 px-3 py-2 text-sm leading-6 outline-none focus:border-moss"
        />
      </label>
      <label className="block text-sm font-medium text-ink">
        备注
        <textarea
          name="description"
          rows={2}
          defaultValue={questionType?.description ?? ""}
          placeholder="可写适用场景、常见误区或判别提示"
          className="mt-2 w-full rounded-md border border-ink/15 px-3 py-2 text-sm leading-6 outline-none focus:border-moss"
        />
      </label>
      <div>
        <button
          type="submit"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-moss px-4 text-sm font-medium text-white"
        >
          <Save className="h-4 w-4" />
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function TextField({
  label,
  name,
  defaultValue,
  placeholder,
  required
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-ink">
      {label}
      <input
        name={name}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-2 h-10 w-full rounded-md border border-ink/15 px-3 text-sm outline-none focus:border-moss"
      />
    </label>
  );
}
