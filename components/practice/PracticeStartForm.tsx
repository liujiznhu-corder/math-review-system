"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import {
  BookOpenCheck,
  Layers3,
  LoaderCircle,
  PlayCircle,
  Target
} from "lucide-react";
import {
  CascadingQuestionTypeFilters,
  type CascadingQuestionTypeOption
} from "@/components/question-types/CascadingQuestionTypeFilters";

type PracticeStartFormProps = {
  questionTypes: Array<
    CascadingQuestionTypeOption & {
      availableProblemCount: number;
    }
  >;
  questionCount: number;
  action: (formData: FormData) => void | Promise<void>;
};

export function PracticeStartForm({
  questionTypes,
  questionCount,
  action
}: PracticeStartFormProps) {
  const [selectedQuestionTypeId, setSelectedQuestionTypeId] = useState("");
  const stats = useMemo(() => getPracticeOptionStats(questionTypes), [
    questionTypes
  ]);

  return (
    <form action={action} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="rounded-md border border-ink/10 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-moss/10 text-moss">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-clay">选择题型</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">
              选择一个三级题型开始训练
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">
              每次固定 {questionCount} 题。题量不足时，系统会从同二级、同一级和全题库补足相近题。
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-md bg-paper p-4">
          <CascadingQuestionTypeFilters
            questionTypes={questionTypes}
            hiddenQuestionTypeIdName="questionTypeId"
            className="grid gap-4 md:grid-cols-3"
            onChange={(value) => setSelectedQuestionTypeId(value.questionTypeId)}
          />
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <StartButton canStart={Boolean(selectedQuestionTypeId)} />
          {!selectedQuestionTypeId ? (
            <p className="flex items-center text-sm text-ink/55">
              请先选择到三级题型，再开始训练。
            </p>
          ) : (
            <p className="flex items-center text-sm text-moss">
              已选定题型，可以开始本组训练。
            </p>
          )}
        </div>
      </section>

      <aside className="rounded-md border border-moss/15 bg-[#F4FAF6] p-5 shadow-sm sm:p-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-white text-moss shadow-sm">
          <BookOpenCheck className="h-5 w-5" />
        </div>
        <p className="mt-5 text-sm font-medium text-moss">本次训练</p>
        <div className="mt-2 flex items-end gap-2">
          <span className="text-5xl font-semibold leading-none text-[#166534]">
            {questionCount}
          </span>
          <span className="pb-1 text-base font-medium text-ink/70">题</span>
        </div>
        <p className="mt-4 text-sm leading-6 text-ink/65">
          点击开始训练后进入新的做题界面，题目、答案解析和掌握状态都在训练流程中处理。
        </p>

        <div className="mt-6 space-y-3 border-t border-moss/15 pt-5">
          <StatusRow
            icon={<Layers3 className="h-4 w-4" />}
            label="可练三级题型"
            value={`${stats.availableCount} 个`}
          />
          <StatusRow
            icon={<Target className="h-4 w-4" />}
            label="题型库总数"
            value={`${stats.totalCount} 个`}
          />
        </div>
      </aside>
    </form>
  );
}

function StartButton({ canStart }: { canStart: boolean }) {
  const { pending } = useFormStatus();
  const disabled = pending || !canStart;

  return (
    <button
      type="submit"
      disabled={disabled}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-moss px-5 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:bg-ink/25 sm:w-auto"
    >
      {pending ? (
        <LoaderCircle className="h-4 w-4 animate-spin" />
      ) : (
        <PlayCircle className="h-4 w-4" />
      )}
      {pending ? "创建训练中..." : "开始训练"}
    </button>
  );
}

function StatusRow({
  icon,
  label,
  value
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="inline-flex items-center gap-2 text-ink/60">
        <span className="text-moss">{icon}</span>
        {label}
      </span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}

function getPracticeOptionStats(
  questionTypes: Array<
    CascadingQuestionTypeOption & {
      availableProblemCount: number;
    }
  >
) {
  return {
    totalCount: questionTypes.length,
    availableCount: questionTypes.filter((item) => item.availableProblemCount > 0)
      .length
  };
}
