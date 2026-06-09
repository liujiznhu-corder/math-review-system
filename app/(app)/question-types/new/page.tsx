import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { QuestionTypeForm } from "@/components/question-types/QuestionTypeForm";
import {
  canManageQuestionTypes,
  getCurrentUserRole,
  redirectStudentToDashboard
} from "@/lib/roles";
import { createQuestionType } from "../actions";

type NewQuestionTypePageProps = {
  searchParams?: Promise<{
    message?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function NewQuestionTypePage({
  searchParams
}: NewQuestionTypePageProps) {
  await redirectStudentToDashboard();
  const role = await getCurrentUserRole();

  if (!canManageQuestionTypes(role)) {
    await redirectStudentToDashboard();
  }

  const params = await searchParams;

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
        <h1 className="mt-1 text-2xl font-semibold text-ink">新增题型</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">
          新增一个三级题型，并维护识别特征、适用场景和代表例题。
        </p>
      </div>

      {params?.message ? (
        <p className="mt-6 rounded-md border border-clay/30 bg-clay/10 px-4 py-3 text-sm text-clay">
          {params.message}
        </p>
      ) : null}

      <section className="mt-8 rounded-md border border-ink/10 bg-white p-5 shadow-sm">
        <QuestionTypeForm action={createQuestionType} submitLabel="新增题型" />
      </section>
    </main>
  );
}
