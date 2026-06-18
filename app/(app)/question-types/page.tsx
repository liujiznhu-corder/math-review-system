import Link from "next/link";
import { FilePenLine, Plus, Search, Tags } from "lucide-react";
import { CascadingQuestionTypeFilters } from "@/components/question-types/CascadingQuestionTypeFilters";
import { DeleteQuestionTypeButton } from "@/components/question-types/DeleteQuestionTypeButton";
import {
  canManageQuestionTypes,
  getCurrentUserRole,
  redirectStudentToDashboard
} from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { deleteQuestionType } from "./actions";

type QuestionTypeRow = Pick<
  Database["public"]["Tables"]["question_types"]["Row"],
  | "id"
  | "level1"
  | "level2"
  | "level3"
  | "keywords"
  | "description"
  | "is_active"
  | "updated_at"
>;
type ExampleSummaryRow = Pick<
  Database["public"]["Tables"]["question_type_examples"]["Row"],
  "id"
>;

type QuestionTypeListItem = QuestionTypeRow & {
  question_type_examples: ExampleSummaryRow[];
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
      "id, level1, level2, level3, keywords, description, is_active, updated_at, question_type_examples(id)"
    )
    .order("level1", { ascending: true })
    .order("level2", { ascending: true })
    .order("level3", { ascending: true });

  const questionTypes = (data ?? []) as QuestionTypeListItem[];
  const filteredQuestionTypes = filterQuestionTypes(questionTypes, filters);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-clay">共享题型库</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">题型库管理</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">
            管理一级、二级、三级题型，以及识别特征和代表例题。列表页用于快速查找，完整说明和例题预览进入详情查看。
          </p>
        </div>
        <Link
          href="/question-types/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-moss px-4 text-sm font-medium text-white"
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

      <section className="mt-6 rounded-md border border-ink/10 bg-white p-4 shadow-sm">
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
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
          <label className="block text-sm font-medium text-ink xl:col-span-2">
            搜索
            <input
              name="keyword"
              defaultValue={filters.keyword}
              placeholder="搜索题型 / 识别特征 / 说明"
              className="mt-2 h-10 w-full rounded-md border border-ink/15 px-3 text-sm outline-none focus:border-moss"
            />
          </label>
          <div className="flex items-end gap-3 md:col-span-2 xl:col-span-6">
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
          <h2 className="text-lg font-semibold text-ink">题型目录</h2>
          <p className="text-sm text-ink/60">
            共 {filteredQuestionTypes.length} / {questionTypes.length} 个题型
          </p>
        </div>

        {filteredQuestionTypes.length === 0 ? (
          <div className="mt-4 rounded-md border border-dashed border-ink/20 bg-white px-5 py-10 text-center text-sm text-ink/60">
            暂无符合条件的题型。
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {filteredQuestionTypes.map((questionType) => (
              <article
                key={questionType.id}
                className="rounded-md border border-ink/10 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink/55">
                      {questionType.level1} / {questionType.level2}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-ink">
                        {questionType.level3}
                      </h3>
                      <StatusBadge active={questionType.is_active} />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center lg:min-w-[520px]">
                    <div className="grid grid-cols-2 gap-2 text-sm text-ink/65">
                      <SummaryPill
                        label="识别特征"
                        value={questionType.keywords.length}
                        unit="个"
                      />
                      <SummaryPill
                        label="代表例题"
                        value={questionType.question_type_examples.length}
                        unit="道"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      <Link
                        href={`/question-types/${questionType.id}`}
                        className="inline-flex h-9 items-center rounded-md bg-ink px-3 text-sm font-medium text-white hover:bg-ink/90"
                      >
                        查看详情
                      </Link>
                      <Link
                        href={`/question-types/${questionType.id}/edit`}
                        title="编辑题型"
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-ink/15 px-3 text-sm font-medium text-ink hover:border-moss/40 hover:text-moss"
                      >
                        <FilePenLine className="h-4 w-4" />
                        编辑
                      </Link>
                      <DeleteQuestionTypeButton
                        id={questionType.id}
                        action={deleteQuestionType}
                        label="删除"
                      />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={[
        "rounded-md px-2 py-1 text-xs font-medium",
        active ? "bg-moss/10 text-moss" : "bg-ink/5 text-ink/55"
      ].join(" ")}
    >
      {active ? "已启用" : "已停用"}
    </span>
  );
}

function SummaryPill({
  label,
  value,
  unit
}: {
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-paper px-3 py-2">
      <Tags className="h-4 w-4 text-ink/45" />
      <span>
        {value} {unit}{label}
      </span>
    </div>
  );
}

function filterQuestionTypes(
  questionTypes: QuestionTypeListItem[],
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
        questionType.keywords.join(" ")
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
