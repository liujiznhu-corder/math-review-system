import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { LatexProblemRenderer } from "@/components/problems/LatexProblemRenderer";
import {
  canManageQuestionTypes,
  getCurrentUserRole,
  redirectStudentToDashboard
} from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import { SolutionEditForm } from "./solution-edit-form";

type QuestionTypeRow = Pick<
  Database["public"]["Tables"]["question_types"]["Row"],
  "id" | "level1" | "level2" | "level3"
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

type ProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "email" | "full_name"
>;

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
  const admin = createAdminClient();
  const { data: problem } = await admin
    .from("problems")
    .select(
      "id, created_by, question_type_id, problem_type, raw_latex, answer, analysis, source, source_type, source_mistake_id, updated_at, question_types(id, level1, level2, level3)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!problem) {
    notFound();
  }

  const normalizedProblem = normalizeProblem(problem as unknown as ProblemRow);
  const profile = normalizedProblem.created_by
    ? await getProfile(normalizedProblem.created_by)
    : null;

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8">
      <Link
        href="/teacher/solutions"
        className="inline-flex items-center gap-2 text-sm font-medium text-ink/65 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        返回答案解析中心
      </Link>

      <div className="mt-6">
        <p className="text-sm font-medium text-clay">答案解析中心</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">
          {normalizedProblem.questionType?.level3 ?? "未指定题型"}
        </h1>
        <p className="mt-2 text-sm text-ink/60">
          {normalizedProblem.questionType
            ? `${normalizedProblem.questionType.level1} / ${normalizedProblem.questionType.level2}`
            : "暂无题型"}
          {" · "}
          {getSourceTypeLabel(normalizedProblem.source_type)}
          {" · "}
          提交人：{getSubmitterLabel(profile, normalizedProblem.created_by)}
        </p>
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
            <LatexProblemRenderer rawLatex={normalizedProblem.raw_latex} />
          </div>
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-moss">
              查看 raw_latex
            </summary>
            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-paper p-3 font-mono text-xs leading-5 text-ink/70">
              {normalizedProblem.raw_latex}
            </pre>
          </details>
        </div>

        <aside className="rounded-md border border-ink/10 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">来源信息</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <InfoRow label="来源类型" value={getSourceTypeLabel(normalizedProblem.source_type)} />
            <InfoRow label="题目类型" value={getProblemTypeLabel(normalizedProblem.problem_type)} />
            <InfoRow label="提交人" value={getSubmitterLabel(profile, normalizedProblem.created_by)} />
            <InfoRow label="更新时间" value={formatDateTime(normalizedProblem.updated_at)} />
            <InfoRow label="来源备注" value={normalizedProblem.source ?? "暂无"} />
            {normalizedProblem.source_mistake_id ? (
              <InfoRow
                label="关联错题"
                value={normalizedProblem.source_mistake_id.slice(0, 8)}
              />
            ) : null}
          </dl>
        </aside>
      </section>

      <section className="mt-8">
        <SolutionEditForm
          problemId={normalizedProblem.id}
          initialAnswer={normalizedProblem.answer}
          initialAnalysis={normalizedProblem.analysis}
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

async function getProfile(id: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .eq("id", id)
    .maybeSingle();

  return (data as ProfileRow | null) ?? null;
}

function normalizeProblem(problem: ProblemRow) {
  return {
    ...problem,
    questionType: Array.isArray(problem.question_types)
      ? (problem.question_types[0] ?? null)
      : problem.question_types
  };
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

function getSourceTypeLabel(value: ProblemRow["source_type"]) {
  return value === "student_submitted" ? "学生提交" : "教师录入";
}

function getProblemTypeLabel(value: ProblemRow["problem_type"]) {
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
