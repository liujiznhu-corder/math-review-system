"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle, PlayCircle } from "lucide-react";
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
  action: (formData: FormData) => void | Promise<void>;
};

export function PracticeStartForm({
  questionTypes,
  action
}: PracticeStartFormProps) {
  return (
    <form action={action} className="rounded-md border border-ink/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-clay">专项训练</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">
            选择一个三级题型开始训练
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">
            V1 每次固定 5 题。题量不足时，系统会从同二级、同一级和全题库补足相近题。
          </p>
        </div>
        <div className="rounded-md bg-paper px-4 py-3 text-sm text-ink/65">
          本次训练：<span className="font-semibold text-ink">5 题</span>
        </div>
      </div>

      <div className="mt-5">
        <CascadingQuestionTypeFilters
          questionTypes={questionTypes}
          hiddenQuestionTypeIdName="questionTypeId"
        />
      </div>

      <QuestionTypeCounts questionTypes={questionTypes} />

      <StartButton />
    </form>
  );
}

function StartButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-moss px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:w-auto"
    >
      {pending ? (
        <LoaderCircle className="h-4 w-4 animate-spin" />
      ) : (
        <PlayCircle className="h-4 w-4" />
      )}
      {pending ? "创建中" : "开始训练"}
    </button>
  );
}

function QuestionTypeCounts({
  questionTypes
}: {
  questionTypes: Array<
    CascadingQuestionTypeOption & {
      availableProblemCount: number;
    }
  >;
}) {
  const availableCount = questionTypes.filter(
    (item) => item.availableProblemCount > 0
  ).length;

  return (
    <p className="mt-3 text-xs text-ink/50">
      当前共有 {availableCount} 个三级题型可练；开始训练时必须选到三级题型。
    </p>
  );
}
