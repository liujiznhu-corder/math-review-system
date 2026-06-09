import Link from "next/link";
import { FilePenLine, Plus, Search } from "lucide-react";
import { CascadingQuestionTypeFilters } from "@/components/question-types/CascadingQuestionTypeFilters";
import { DeleteQuestionTypeButton } from "@/components/question-types/DeleteQuestionTypeButton";
import { LatexProblemRenderer } from "@/components/problems/LatexProblemRenderer";
import {
  canManageQuestionTypes,
  getCurrentUserRole,
  redirectStudentToDashboard
} from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { deleteQuestionType } from "./actions";

type QuestionTypeRow = Database["public"]["Tables"]["question_types"]["Row"];
type ExampleRow = Pick<
  Database["public"]["Tables"]["question_type_examples"]["Row"],
  "id" | "example_text" | "solution_hint"
>;

type QuestionTypeWithExamples = QuestionTypeRow & {
  question_type_examples: ExampleRow[];
};

type QuestionTypesPageProps = {
  searchParams?: Promise<{
    message?: string;
    level1?: string;
    level2?: string;
    level3?: string;
    status?: string;
    keyword?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function QuestionTypesPage({
  searchParams
}: QuestionTypesPageProps) {
  const params = await searchParams;
  const filters = {
    level1: params?.level1 ?? "",
    level2: params?.level2 ?? "",
    level3: params?.level3 ?? "",
    status: params?.status ?? "",
    keyword: params?.keyword ?? ""
  };

  await redirectStudentToDashboard();
  const role = await getCurrentUserRole();

  if (!canManageQuestionTypes(role)) {
    await redirectStudentToDashboard();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("question_types")
    .select(
      "id, level1, level2, level3, keywords, description, is_active, created_by, created_at, updated_at, question_type_examples(id, example_text, solution_hint)"
    )
    .order("level1", { ascending: true })
    .order("level2", { ascending: true })
    .order("level3", { ascending: true });

  const questionTypes = (data ?? []) as QuestionTypeWithExamples[];
  const filteredQuestionTypes = filterQuestionTypes(questionTypes, filters);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-clay">共享题型库</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">题型库管理</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">
            列表页用于查询、筛选、编辑跳转和删除题型；新增和编辑在独立页面完成。
          </p>
        </div>
        <Link
          href="/question-types/new"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-moss px-4 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" />
          新增题型
        </Link>
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
        <form className="grid gap-4 lg:grid-cols-5">
          <CascadingQuestionTypeFilters
            questionTypes={questionTypes}
            selectedLevel1={filters.level1}
            selectedLevel2={filters.level2}
            selectedLevel3={filters.level3}
            className="contents"
          />
          <label className="block text-sm font-medium text-ink">
            启用状态
            <select
              name="status"
              defaultValue={filters.status}
              className="mt-2 h-10 w-full rounded-md border border-ink/15 bg-white px-3 text-sm outline-none focus:border-moss"
            >
              <option value="">全部</option>
              <option value="active">已启用</option>
              <option value="inactive">已停用</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-ink">
            搜索
            <input
              name="keyword"
              defaultValue={filters.keyword}
              placeholder="搜索题型 / 识别特征 / 说明 / 例题"
              className="mt-2 h-10 w-full rounded-md border border-ink/15 px-3 text-sm outline-none focus:border-moss"
            />
          </label>
          <div className="flex items-end gap-3 lg:col-span-5">
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-moss px-4 text-sm font-medium text-white"
            >
              <Search className="h-4 w-4" />
              筛选
            </button>
            <Link
              href="/question-types"
              className="inline-flex h-10 items-center rounded-md px-4 text-sm font-medium text-ink/65 hover:text-ink"
            >
              清除
            </Link>
          </div>
        </form>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">题型列表</h2>
          <p className="text-sm text-ink/60">
            共 {filteredQuestionTypes.length} / {questionTypes.length} 个题型
          </p>
        </div>

        {filteredQuestionTypes.length === 0 ? (
          <div className="mt-4 rounded-md border border-dashed border-ink/20 bg-white px-5 py-10 text-center text-sm text-ink/60">
            暂无符合条件的题型。
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {filteredQuestionTypes.map((questionType) => (
              <article
                key={questionType.id}
                className="rounded-md border border-ink/10 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm text-ink/55">
                      {questionType.level1} / {questionType.level2}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-ink">
                        {questionType.level3}
                      </h3>
                      <span className="rounded-md bg-paper px-2 py-1 text-xs text-ink/60">
                        {questionType.is_active ? "已启用" : "已停用"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/question-types/${questionType.id}/edit`}
                      title="编辑题型"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-ink/15 text-ink hover:border-moss/40 hover:text-moss"
                    >
                      <FilePenLine className="h-4 w-4" />
                    </Link>
                    <DeleteQuestionTypeButton
                      id={questionType.id}
                      action={deleteQuestionType}
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                  <section className="rounded-md bg-paper p-4">
                    <h4 className="text-sm font-semibold text-ink">
                      题型说明 / 适用场景
                    </h4>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink/65">
                      {questionType.description || "暂无说明"}
                    </p>
                    <h4 className="mt-4 text-sm font-semibold text-ink">
                      题型识别特征
                    </h4>
                    {questionType.keywords.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {questionType.keywords.map((feature) => (
                          <span
                            key={feature}
                            className="rounded-md bg-white px-2 py-1 text-xs text-ink/70"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-ink/50">暂无识别特征</p>
                    )}
                  </section>

                  <section className="rounded-md bg-paper p-4">
                    <h4 className="text-sm font-semibold text-ink">
                      代表例题预览
                    </h4>
                    {questionType.question_type_examples.length > 0 ? (
                      <div className="mt-3 space-y-3">
                        {questionType.question_type_examples.map(
                          (example, index) => (
                            <div
                              key={example.id}
                              className="rounded-md border border-ink/10 bg-white p-3"
                            >
                              <p className="mb-2 text-xs font-medium text-ink/55">
                                例题 {index + 1}
                              </p>
                              <LatexProblemRenderer
                                rawLatex={example.example_text}
                              />
                              {example.solution_hint ? (
                                <p className="mt-3 rounded-md bg-paper px-3 py-2 text-xs leading-5 text-ink/60">
                                  提示：{example.solution_hint}
                                </p>
                              ) : null}
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-ink/50">暂无代表例题</p>
                    )}
                  </section>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function filterQuestionTypes(
  questionTypes: QuestionTypeWithExamples[],
  filters: {
    level1: string;
    level2: string;
    level3: string;
    status: string;
    keyword: string;
  }
) {
  const keyword = filters.keyword.trim().toLowerCase();

  return questionTypes.filter((questionType) => {
    if (filters.level1 && questionType.level1 !== filters.level1) {
      return false;
    }

    if (filters.level2 && questionType.level2 !== filters.level2) {
      return false;
    }

    if (filters.level3 && questionType.level3 !== filters.level3) {
      return false;
    }

    if (filters.status === "active" && !questionType.is_active) {
      return false;
    }

    if (filters.status === "inactive" && questionType.is_active) {
      return false;
    }

    if (keyword) {
      const searchable = [
        questionType.level1,
        questionType.level2,
        questionType.level3,
        questionType.description ?? "",
        questionType.keywords.join(" "),
        questionType.question_type_examples
          .map((example) => `${example.example_text} ${example.solution_hint ?? ""}`)
          .join(" ")
      ]
        .join(" ")
        .toLowerCase();

      if (!searchable.includes(keyword)) {
        return false;
      }
    }

    return true;
  });
}
