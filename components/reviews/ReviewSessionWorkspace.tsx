"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, CheckCircle2, Eye, Home, XCircle } from "lucide-react";
import { LatexContentRenderer } from "@/components/problems/LatexContentRenderer";
import { LatexProblemRenderer } from "@/components/problems/LatexProblemRenderer";
import type { TodayReviewTask } from "@/services/student/reviews";

type ReviewSessionWorkspaceProps = {
  initialTasks: TodayReviewTask[];
  completedTodayCount: number;
};

type ReviewResult = "mastered" | "not_mastered";

type ReviewTaskState = TodayReviewTask & {
  localResult: ReviewResult | null;
};

type ApiSuccess<T> = {
  ok: true;
  data: T;
};

type ApiFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
};

export function ReviewSessionWorkspace({
  initialTasks,
  completedTodayCount
}: ReviewSessionWorkspaceProps) {
  const [tasks, setTasks] = useState<ReviewTaskState[]>(
    () => initialTasks.map((task) => ({ ...task, localResult: null }))
  );
  const [activeTaskId, setActiveTaskId] = useState(initialTasks[0]?.id ?? "");
  const [viewedTaskIds, setViewedTaskIds] = useState<Set<string>>(
    () => new Set()
  );
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const activeTask =
    tasks.find((task) => task.id === activeTaskId) ?? tasks[0] ?? null;
  const completedInSession = tasks.filter((task) => task.localResult).length;
  const allDone = tasks.length > 0 && completedInSession === tasks.length;
  const totalCompletedToday = completedTodayCount + completedInSession;

  function markAnswerViewed(taskId: string) {
    setViewedTaskIds((current) => new Set(current).add(taskId));
  }

  function moveBy(offset: number) {
    if (!activeTask || tasks.length === 0) {
      return;
    }

    const index = tasks.findIndex((task) => task.id === activeTask.id);
    const nextIndex = (index + offset + tasks.length) % tasks.length;
    setActiveTaskId(tasks[nextIndex].id);
  }

  function moveToNextUnfinished(nextTasks: ReviewTaskState[], currentTaskId: string) {
    const currentIndex = nextTasks.findIndex((task) => task.id === currentTaskId);
    const ordered = [
      ...nextTasks.slice(currentIndex + 1),
      ...nextTasks.slice(0, currentIndex + 1)
    ];
    const next = ordered.find((task) => !task.localResult) ?? ordered[0];

    if (next) {
      setActiveTaskId(next.id);
    }
  }

  function completeTask(task: ReviewTaskState, result: ReviewResult) {
    if (!viewedTaskIds.has(task.id)) {
      const confirmed = window.confirm("建议先查看答案后再判断掌握情况。仍要继续吗？");

      if (!confirmed) {
        return;
      }
    }

    setMessage("");
    startTransition(async () => {
      try {
        const response = await fetch(`/api/student/reviews/${task.id}/complete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ result })
        });
        const payload = (await response.json()) as
          | ApiSuccess<{ taskId: string; result: ReviewResult; completedAt: string }>
          | ApiFailure;

        if (!payload.ok) {
          throw new Error(payload.error.message);
        }

        const nextTasks = tasks.map((item) =>
          item.id === task.id
            ? {
                ...item,
                localResult: payload.data.result
              }
            : item
        );

        setTasks(nextTasks);

        if (nextTasks.every((item) => item.localResult)) {
          setMessage("今日复习已全部完成。");
          return;
        }

        moveToNextUnfinished(nextTasks, task.id);
        setMessage("复习记录已更新，已自动切到下一题。");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "复习记录更新失败");
      }
    });
  }

  if (tasks.length === 0) {
    return (
      <div className="mt-8 rounded-md border border-dashed border-ink/20 bg-white px-5 py-10 text-center text-sm text-ink/60">
        今天暂无待复习错题。
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <section className="grid gap-3 md:grid-cols-3">
        <Metric label="今日待复习" value={tasks.length} />
        <Metric label="今日已完成" value={totalCompletedToday} />
        <Metric label="当前进度" value={`${completedInSession} / ${tasks.length}`} />
      </section>

      {message ? (
        <p className="rounded-md border border-moss/20 bg-white px-4 py-3 text-sm text-moss">
          {message}
        </p>
      ) : null}

      {allDone ? (
        <section className="rounded-md border border-moss/20 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">今日复习完成</h2>
          <p className="mt-2 text-sm text-ink/65">
            已完成 {tasks.length} 道复习题，可以回到仪表盘查看今日进度。
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-moss px-4 text-sm font-medium text-white sm:h-10"
            >
              <Home className="h-4 w-4" />
              返回仪表盘
            </Link>
            <button
              type="button"
              onClick={() => setActiveTaskId(tasks[0].id)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-ink/15 bg-white px-4 text-sm font-medium text-ink sm:h-10"
            >
              回看题目
            </button>
          </div>
        </section>
      ) : null}

      <ReviewNavigator
        tasks={tasks}
        activeTaskId={activeTask?.id}
        onSelect={setActiveTaskId}
      />

      {activeTask ? (
        <ReviewTaskDetail
          task={activeTask}
          answerViewed={viewedTaskIds.has(activeTask.id)}
          disabled={isPending || Boolean(activeTask.localResult)}
          onViewAnswer={() => markAnswerViewed(activeTask.id)}
          onComplete={(result) => completeTask(activeTask, result)}
          onPrev={() => moveBy(-1)}
          onNext={() => moveBy(1)}
        />
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-ink/10 bg-white px-4 py-3">
      <p className="text-xs text-ink/55">{label}</p>
      <p className="mt-1 text-xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function ReviewNavigator({
  tasks,
  activeTaskId,
  onSelect
}: {
  tasks: ReviewTaskState[];
  activeTaskId?: string;
  onSelect: (taskId: string) => void;
}) {
  return (
    <section className="rounded-md border border-ink/10 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-ink">题目列表</h2>
        <p className="text-sm text-ink/55">点击题号可自由切换。</p>
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {tasks.map((task, index) => (
          <button
            key={task.id}
            type="button"
            onClick={() => onSelect(task.id)}
            className={[
              "min-h-16 min-w-28 shrink-0 rounded-md border px-3 py-2 text-left text-sm transition",
              getNavigatorClassName(task.localResult, task.id === activeTaskId)
            ].join(" ")}
          >
            <p className="font-medium">第{index + 1}题</p>
            <p className="mt-1 text-xs">{getResultLabel(task.localResult)}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

function ReviewTaskDetail({
  task,
  answerViewed,
  disabled,
  onViewAnswer,
  onComplete,
  onPrev,
  onNext
}: {
  task: ReviewTaskState;
  answerViewed: boolean;
  disabled: boolean;
  onViewAnswer: () => void;
  onComplete: (result: ReviewResult) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const mistake = task.mistake;
  const questionType = mistake?.questionType;

  return (
    <article className="rounded-md border border-ink/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-ink/55">
            {questionType
              ? `${questionType.level1} / ${questionType.level2}`
              : "未分类"}
          </p>
          <h2 className="mt-1 text-base font-semibold text-ink">
            {questionType?.level3 ?? "未确认题型"}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-md bg-paper px-3 py-2 text-sm text-ink/65">
            {getReviewRoundLabel(task.reviewRound)}
          </span>
          <span className={getStatusBadgeClassName(task.localResult)}>
            {getResultLabel(task.localResult)}
          </span>
        </div>
      </div>

      <div className="mt-4 max-w-full overflow-x-auto rounded-md bg-paper p-4">
        {mistake?.inputType === "latex" ? (
          <LatexProblemRenderer
            rawLatex={mistake.rawLatex ?? mistake.latexContent}
          />
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-6 text-ink/75">
            {mistake?.rawText || mistake?.stem}
          </p>
        )}
      </div>

      {mistake?.note ? (
        <p className="mt-3 text-sm leading-6 text-ink/65">
          学生备注：{mistake.note}
        </p>
      ) : null}

      <div className="mt-4">
        <button
          type="button"
          onClick={onViewAnswer}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-moss/25 bg-white px-4 text-sm font-medium text-moss sm:h-10 sm:w-auto"
        >
          <Eye className="h-4 w-4" />
          查看答案
        </button>

        {answerViewed ? (
          mistake?.answer?.trim() || mistake?.analysis?.trim() ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <section className="max-w-full overflow-x-auto rounded-md bg-paper p-4">
                <h3 className="text-sm font-semibold text-ink">答案</h3>
                <div className="mt-3">
                  <LatexContentRenderer
                    content={mistake.answer}
                    fallback="暂无答案"
                  />
                </div>
              </section>
              <section className="max-w-full overflow-x-auto rounded-md bg-paper p-4">
                <h3 className="text-sm font-semibold text-ink">解析</h3>
                <div className="mt-3">
                  <LatexContentRenderer
                    content={mistake.analysis}
                    fallback="暂无解析"
                  />
                </div>
              </section>
            </div>
          ) : (
            <div className="mt-4 rounded-md bg-paper px-4 py-3 text-sm text-ink/60">
              答案解析暂未补充。
              {mistake ? (
                <Link
                  href={`/mistakes/${mistake.id}/answer?returnUrl=${encodeURIComponent("/reviews")}`}
                  className="ml-2 font-medium text-moss"
                >
                  打开答案页
                </Link>
              ) : null}
            </div>
          )
        ) : null}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={() => onComplete("mastered")}
          disabled={disabled}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-moss px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 sm:h-10"
        >
          <CheckCircle2 className="h-4 w-4" />
          已掌握
        </button>
        <button
          type="button"
          onClick={() => onComplete("not_mastered")}
          disabled={disabled}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-clay/25 bg-clay/10 px-4 text-sm font-medium text-clay disabled:cursor-not-allowed disabled:opacity-50 sm:h-10"
        >
          <XCircle className="h-4 w-4" />
          未掌握
        </button>
        <button
          type="button"
          onClick={onPrev}
          className="inline-flex h-11 items-center justify-center rounded-md border border-ink/15 bg-white px-4 text-sm font-medium text-ink sm:h-10"
        >
          上一题
        </button>
        <button
          type="button"
          onClick={onNext}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-ink/15 bg-white px-4 text-sm font-medium text-ink sm:h-10"
        >
          下一题
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

function getNavigatorClassName(result: ReviewResult | null, active: boolean) {
  if (result === "mastered") {
    return active
      ? "border-moss bg-moss/15 text-moss"
      : "border-moss/25 bg-moss/10 text-moss";
  }

  if (result === "not_mastered") {
    return active
      ? "border-clay bg-clay/15 text-clay"
      : "border-clay/25 bg-clay/10 text-clay";
  }

  return active
    ? "border-moss bg-white text-ink shadow-sm"
    : "border-ink/10 bg-white text-ink/60";
}

function getStatusBadgeClassName(result: ReviewResult | null) {
  const base = "rounded-md px-3 py-2 text-sm";

  if (result === "mastered") {
    return `${base} bg-moss/10 text-moss`;
  }

  if (result === "not_mastered") {
    return `${base} bg-clay/10 text-clay`;
  }

  return `${base} border border-ink/10 bg-white text-ink/55`;
}

function getResultLabel(result: ReviewResult | null) {
  if (result === "mastered") {
    return "已掌握";
  }

  if (result === "not_mastered") {
    return "未掌握";
  }

  return "未完成";
}

function getReviewRoundLabel(reviewRound: string) {
  const labels: Record<string, string> = {
    day1: "第1天",
    day3: "第3天",
    day7: "第7天",
    day14: "第14天",
    day30: "第30天",
    retry_day3: "补复习第3天",
    retry_day7: "补复习第7天"
  };

  return labels[reviewRound] ?? reviewRound;
}
