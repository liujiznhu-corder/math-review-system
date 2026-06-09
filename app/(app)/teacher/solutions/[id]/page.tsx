import Link from "next/link";
import { ArrowLeft, LibraryBig } from "lucide-react";
import { notFound } from "next/navigation";
import { LatexProblemRenderer } from "@/components/problems/LatexProblemRenderer";
import {
  canManageQuestionTypes,
  getCurrentUserRole,
  redirectStudentToDashboard
} from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import { CopyLatexButton } from "../../problems/copy-latex-button";
import { addMistakeToProblemLibrary } from "../actions";
import { SolutionEditForm } from "./solution-edit-form";

type QuestionTypeRow = Pick<
  Database["public"]["Tables"]["question_types"]["Row"],
  "id" | "level1" | "level2" | "level3"
>;

type ProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "email" | "full_name"
>;

type ProblemRow = Pick<
  Database["public"]["Tables"]["problems"]["Row"],
  | "id"
  | "created_by"
  | "question_type_id"
  | "problem_type"
  | "raw_latex"
  | "answer"
  | "analysis"
  | "source"
  | "source_type"
  | "source_mistake_id"
  | "updated_at"
> & {
  question_types: QuestionTypeRow | QuestionTypeRow[] | null;
};

type MistakeRow = Pick<
  Database["public"]["Tables"]["mistakes"]["Row"],
  | "id"
  | "user_id"
  | "question_type_id"
  | "problem_type"
  | "stem"
  | "raw_latex"
  | "latex_content"
  | "answer"
  | "analysis"
  | "source"
  | "updated_at"
> & {
  question_types: QuestionTypeRow | QuestionTypeRow[] | null;
};

type SolutionRecord = {
  id: string;
  solutionType: "problem" | "mistake";
  createdBy: string | null;
  problemType: "single_choice" | "fill_blank" | "calculation";
  rawLatex: string;
  answer: string | null;
  analysis: string | null;
  source: string | null;
  sourceType: "teacher_created" | "student_submitted";
  sourceMistakeId: string | null;
  updatedAt: string;
  questionType: QuestionTypeRow | null;
};

type SolutionPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ message?: string }>;
};

export const dynamic = "force-dynamic";

export default async function SolutionPage({
  params,
  searchParams
}: SolutionPageProps) {
  await redirectStudentToDashboard();
  const role = await getCurrentUserRole();

  if (!canManageQuestionTypes(role)) {
    await redirectStudentToDashboard();
  }

  const { id } = await params;
  const query = await searchParams;
  const record = id.startsWith("mistake_")
    ? await loadMistakeRecord(id.replace(/^mistake_/, ""))
    : await loadProblemRecord(id);

  if (!record) {
    notFound();
  }

  const profile = record.createdBy ? await getProfile(record.createdBy) : null;

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8">
      <Link
        href="/teacher/solutions"
        className="inline-flex items-center gap-2 text-sm font-medium text-ink/65 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        返回答案解析中心
      </Link>

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-clay">答案解析中心</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">
            {record.questionType?.level3 ?? "未指定题型"}
          </h1>
          <p className="mt-2 text-sm text-ink/60">
            {record.questionType
              ? `${record.questionType.level1} / ${record.questionType.level2}`
              : "暂无题型"}
            {" · "}
            {getSourceTypeLabel(record.sourceType)}
            {" · "}
            提交人：{getSubmitterLabel(profile, record.createdBy)}
          </p>
        </div>

        {record.solutionType === "mistake" ? (
          <form action={addMistakeToProblemLibrary}>
            <input type="hidden" name="mistakeId" value={record.id} />
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-moss px-4 text-sm font-medium text-white"
            >
              <LibraryBig className="h-4 w-4" />
              加入教师题库
            </button>
          </form>
        ) : record.sourceMistakeId ? (
          <span className="inline-flex h-10 items-center rounded-md border border-moss/20 bg-moss/10 px-4 text-sm font-medium text-moss">
            已加入题库
          </span>
        ) : null}
      </div>

      {query?.message ? (
        <p className="mt-6 rounded-md border border-moss/20 bg-white px-4 py-3 text-sm text-moss">
          {query.message}
        </p>
      ) : null}

      <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-md border border-ink/10 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">题目</h2>
          <div className="mt-4 rounded-md bg-paper p-4">
            <LatexProblemRenderer rawLatex={record.rawLatex} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <CopyLatexButton rawLatex={record.rawLatex} label="复制题目 LaTeX" />
            <CopyLatexButton rawLatex={record.answer} label="复制答案 LaTeX" />
            <CopyLatexButton rawLatex={record.analysis} label="复制解析 LaTeX" />
          </div>
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-moss">
              查看 raw_latex
            </summary>
            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-paper p-3 font-mono text-xs leading-5 text-ink/70">
              {record.rawLatex}
            </pre>
          </details>
        </div>

        <aside className="rounded-md border border-ink/10 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">来源信息</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <InfoRow
              label="来源类型"
              value={getSourceTypeLabel(record.sourceType)}
            />
            <InfoRow
              label="题目类型"
              value={getProblemTypeLabel(record.problemType)}
            />
            <InfoRow
              label="提交人"
              value={getSubmitterLabel(profile, record.createdBy)}
            />
            <InfoRow label="更新时间" value={formatDateTime(record.updatedAt)} />
            <InfoRow label="来源备注" value={record.source ?? "暂无"} />
            {record.sourceMistakeId ? (
              <InfoRow
                label="关联错题"
                value={record.sourceMistakeId.slice(0, 8)}
              />
            ) : null}
          </dl>
        </aside>
      </section>

      <section className="mt-8">
        <SolutionEditForm
          recordId={record.id}
          solutionType={record.solutionType}
          initialAnswer={record.answer}
          initialAnalysis={record.analysis}
        />
      </section>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-ink/50">{label}</dt>
      <dd className="mt-1 font-medium text-ink">{value}</dd>
    </div>
  );
}

async function loadProblemRecord(id: string): Promise<SolutionRecord | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("problems")
    .select(
      "id, created_by, question_type_id, problem_type, raw_latex, answer, analysis, source, source_type, source_mistake_id, updated_at, question_types(id, level1, level2, level3)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    return null;
  }

  const problem = data as unknown as ProblemRow;
  return {
    id: problem.id,
    solutionType: "problem",
    createdBy: problem.created_by,
    problemType: problem.problem_type,
    rawLatex: problem.raw_latex,
    answer: problem.answer,
    analysis: problem.analysis,
    source: problem.source,
    sourceType: problem.source_type,
    sourceMistakeId: problem.source_mistake_id,
    updatedAt: problem.updated_at,
    questionType: normalizeQuestionType(problem.question_types)
  };
}

async function loadMistakeRecord(id: string): Promise<SolutionRecord | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("mistakes")
    .select(
      "id, user_id, question_type_id, problem_type, stem, raw_latex, latex_content, answer, analysis, source, updated_at, question_types(id, level1, level2, level3)"
    )
    .eq("id", id)
    .in("classification_status", ["student_selected", "teacher_confirmed"])
    .maybeSingle();

  if (!data) {
    return null;
  }

  const mistake = data as unknown as MistakeRow;
  return {
    id: mistake.id,
    solutionType: "mistake",
    createdBy: mistake.user_id,
    problemType: mistake.problem_type,
    rawLatex: mistake.raw_latex || mistake.latex_content || mistake.stem,
    answer: mistake.answer,
    analysis: mistake.analysis,
    source: mistake.source,
    sourceType: "student_submitted",
    sourceMistakeId: mistake.id,
    updatedAt: mistake.updated_at,
    questionType: normalizeQuestionType(mistake.question_types)
  };
}

async function getProfile(id: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .eq("id", id)
    .maybeSingle();

  return (data as ProfileRow | null) ?? null;
}

function normalizeQuestionType(
  value: QuestionTypeRow | QuestionTypeRow[] | null
): QuestionTypeRow | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function getSubmitterLabel(profile: ProfileRow | null, userId: string | null) {
  if (profile?.full_name) {
    return profile.full_name;
  }

  if (profile?.email) {
    return profile.email;
  }

  return userId ? `${userId.slice(0, 8)}...` : "未知";
}

function getSourceTypeLabel(value: SolutionRecord["sourceType"]) {
  return value === "student_submitted" ? "学生提交" : "教师录入";
}

function getProblemTypeLabel(value: SolutionRecord["problemType"]) {
  if (value === "single_choice") {
    return "单选题";
  }

  if (value === "fill_blank") {
    return "填空题";
  }

  return "计算题";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
