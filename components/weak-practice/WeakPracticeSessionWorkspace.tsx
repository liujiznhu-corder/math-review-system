"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  Home,
  RotateCcw,
  XCircle
} from "lucide-react";
import { LatexContentRenderer } from "@/components/problems/LatexContentRenderer";
import { LatexProblemRenderer } from "@/components/problems/LatexProblemRenderer";
import type { WeakPracticeTask } from "@/services/weak-practice";

type WeakPracticeSessionWorkspaceProps = {
  initialTasks: WeakPracticeTask[];
};

type PracticeResult = "mastered" | "not_mastered";

type TaskState = WeakPracticeTask;

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

export function WeakPracticeSessionWorkspace({
  initialTasks
}: WeakPracticeSessionWorkspaceProps) {
  const [tasks, setTasks] = useState<TaskState[]>(initialTasks);
  const [activeTaskId, setActiveTaskId] = useState(initialTasks[0]?.id ?? "");
  const [viewedTaskIds, setViewedTaskIds] = useState<Set<string>>(
    () => new Set()
  );
  const [message, setMessage] = useState("");
  const [reviewMode, setReviewMode] = useState(false);
  const [isPending, startTransition] = useTransition();

  const activeTask =
    tasks.find((task) => task.id === activeTaskId) ?? tasks[0] ?? null;
  const completedCount = tasks.filter((task) => task.status === "completed").length;
  const masteredCount = tasks.filter((task) => task.result === "mastered").length;
  const notMasteredTasks = tasks.filter(
    (task) => task.result === "not_mastered"
  );
  const allDone = tasks.length > 0 && completedCount === tasks.length;

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

  function moveToNextUnfinished(nextTasks: TaskState[], currentTaskId: string) {
    const currentIndex = nextTasks.findIndex((task) => task.id === currentTaskId);
    const ordered = [
      ...nextTasks.slice(currentIndex + 1),
      ...nextTasks.slice(0, currentIndex + 1)
    ];
    const next = ordered.find((task) => task.status !== "completed");

    if (next) {
      setActiveTaskId(next.id);
    }
  }

  function completeTask(task: TaskState, result: PracticeResult) {
    if (task.status === "completed") {
      return;
    }

    setMessage("");
    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/student/weak-practice/${task.id}/complete`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ result })
          }
        );
        const payload = (await response.json()) as
          | ApiSuccess<{
              taskId: string;
              result: PracticeResult;
              completedAt: string;
            }>
          | ApiFailure;

        if (!payload.ok) {
          throw new Error(payload.error.message);
        }

        const nextTasks = tasks.map((item) =>
          item.id === task.id
            ? {
                ...item,
                status: "completed" as const,
                result: payload.data.result,
                completedAt: payload.data.completedAt
              }
            : item
        );

        setTasks(nextTasks);

        if (nextTasks.every((item) => item.status === "completed")) {
          setReviewMode(false);
          setMessage("今日薄弱巩固已全部完成。");
          return;
        }

        moveToNextUnfinished(nextTasks, task.id);
        setMessage("训练记录已更新，已自动切到下一道未完成题。");
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "薄弱巩固记录更新失败"
        );
      }
    });
  }

  if (tasks.length === 0) {
    return (
      <div className="mt-8 rounded-md border border-dashed border-ink/20 bg-white px-5 py-10 text-center text-sm text-ink/60">
        教师题库中暂时没有可推荐的题目。请先让老师录入带题型的题目。
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <section className="grid gap-3 md:grid-cols-3">
        <Metric label="总题数" value={tasks.length} />
        <Metric label="已完成数量" value={completedCount} />
        <Metric label="当前进度" value={`${completedCount} / ${tasks.length}`} />
      </section>

      {message ? (
        <p className="rounded-md border border-moss/20 bg-white px-4 py-3 text-sm text-moss">
          {message}
        </p>
      ) : null}

      {allDone && !reviewMode ? (
        <WeakPracticeSummary
          totalCount={tasks.length}
          masteredCount={masteredCount}
          notMasteredTasks={notMasteredTasks}
          onReviewAgain={() => {
            setActiveTaskId(tasks[0].id);
            setReviewMode(true);
          }}
        />
      ) : (
        <>
          <WeakPracticeNavigator
            tasks={tasks}
            activeTaskId={activeTask?.id}
            viewedTaskIds={viewedTaskIds}
            onSelect={setActiveTaskId}
          />

          {activeTask ? (
            <WeakPracticeTaskDetail
              task={activeTask}
              answerViewed={viewedTaskIds.has(activeTask.id)}
              disabled={isPending || activeTask.status === "completed"}
              onViewAnswer={() => markAnswerViewed(activeTask.id)}
              onComplete={(result) => completeTask(activeTask, result)}
              onPrev={() => moveBy(-1)}
              onNext={() => moveBy(1)}
            />
          ) : null}
        </>
      )}
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

function WeakPracticeNavigator({
  tasks,
  activeTaskId,
  viewedTaskIds,
  onSelect
}: {
  tasks: TaskState[];
  activeTaskId?: string;
  viewedTaskIds: Set<string>;
  onSelect: (taskId: string) => void;
}) {
  return (
    <section className="rounded-md border border-ink/10 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-ink">题目导航</h2>
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
              getNavigatorClassName(
                task,
                viewedTaskIds.has(task.id),
                task.id === activeTaskId
              )
            ].join(" ")}
          >
            <p className="font-medium">第{index + 1}题</p>
            <p className="mt-1 text-xs">
              {getTaskStatusLabel(task, viewedTaskIds.has(task.id))}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}

function WeakPracticeTaskDetail({
  task,
  answerViewed,
  disabled,
  onViewAnswer,
  onComplete,
  onPrev,
  onNext
}: {
  task: TaskState;
  answerViewed: boolean;
  disabled: boolean;
  onViewAnswer: () => void;
  onComplete: (result: PracticeResult) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const problem = task.problem;
  const questionType = problem?.questionType;

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
            {task.sourceLabel}
          </span>
          <span className={getStatusBadgeClassName(task)}>
            {getTaskStatusLabel(task, answerViewed)}
          </span>
        </div>
      </div>

      <div className="mt-4 max-w-full overflow-x-auto rounded-md bg-paper p-4">
        {problem ? (
          <LatexProblemRenderer rawLatex={problem.displayLatex} />
        ) : (
          <p className="text-sm text-ink/55">题目已不存在。</p>
        )}
      </div>

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
          problem?.answer?.trim() || problem?.analysis?.trim() ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <section className="max-w-full overflow-x-auto rounded-md bg-paper p-4">
                <h3 className="text-sm font-semibold text-ink">答案</h3>
                <div className="mt-3">
                  <LatexContentRenderer
                    content={problem.answer}
                    fallback="暂无答案"
                  />
                </div>
              </section>
              <section className="max-w-full overflow-x-auto rounded-md bg-paper p-4">
                <h3 className="text-sm font-semibold text-ink">解析</h3>
                <div className="mt-3">
                  <LatexContentRenderer
                    content={problem.analysis}
                    fallback="暂无解析"
                  />
                </div>
              </section>
            </div>
          ) : (
            <div className="mt-4 rounded-md bg-paper px-4 py-3 text-sm text-ink/60">
              答案解析暂未补充，请等待老师更新。
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
          仍需巩固
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

function WeakPracticeSummary({
  totalCount,
  masteredCount,
  notMasteredTasks,
  onReviewAgain
}: {
  totalCount: number;
  masteredCount: number;
  notMasteredTasks: TaskState[];
  onReviewAgain: () => void;
}) {
  return (
    <section className="rounded-md border border-moss/20 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-ink">今日薄弱巩固完成</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Metric label="总题数" value={totalCount} />
        <Metric label="已掌握" value={masteredCount} />
        <Metric label="仍需巩固" value={notMasteredTasks.length} />
      </div>

      <div className="mt-5 rounded-md bg-paper p-4">
        <h3 className="text-sm font-semibold text-ink">仍需巩固题目</h3>
        {notMasteredTasks.length > 0 ? (
          <div className="mt-3 space-y-3">
            {notMasteredTasks.map((task, index) => (
              <div
                key={task.id}
                className="rounded-md border border-ink/10 bg-white p-3"
              >
                <p className="text-xs text-clay">第{index + 1}题</p>
                <p className="mt-1 text-sm text-ink/65">
                  {task.problem?.questionType
                    ? `${task.problem.questionType.level1} / ${task.problem.questionType.level2} / ${task.problem.questionType.level3}`
                    : "未确认题型"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink/60">
            今天的 5 道题都已掌握，保持这个节奏。
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={onReviewAgain}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-ink/15 bg-white px-4 text-sm font-medium text-ink sm:h-10"
        >
          <RotateCcw className="h-4 w-4" />
          再练一次
        </button>
        <Link
          href="/dashboard"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-moss px-4 text-sm font-medium text-white sm:h-10"
        >
          <Home className="h-4 w-4" />
          返回首页
        </Link>
      </div>
    </section>
  );
}

function getNavigatorClassName(
  task: TaskState,
  answerViewed: boolean,
  active: boolean
) {
  if (task.result === "mastered") {
    return active
      ? "border-moss bg-moss/15 text-moss"
      : "border-moss/25 bg-moss/10 text-moss";
  }

  if (task.result === "not_mastered") {
    return active
      ? "border-clay bg-clay/15 text-clay"
      : "border-clay/25 bg-clay/10 text-clay";
  }

  if (answerViewed) {
    return active
      ? "border-ink/30 bg-paper text-ink"
      : "border-ink/10 bg-paper text-ink/65";
  }

  return active
    ? "border-moss bg-white text-ink shadow-sm"
    : "border-ink/10 bg-white text-ink/60";
}

function getStatusBadgeClassName(task: TaskState) {
  const base = "rounded-md px-3 py-2 text-sm";

  if (task.result === "mastered") {
    return `${base} bg-moss/10 text-moss`;
  }

  if (task.result === "not_mastered") {
    return `${base} bg-clay/10 text-clay`;
  }

  return `${base} border border-ink/10 bg-white text-ink/55`;
}

function getTaskStatusLabel(task: TaskState, answerViewed: boolean) {
  if (task.result === "mastered") {
    return "已掌握";
  }

  if (task.result === "not_mastered") {
    return "仍需巩固";
  }

  if (answerViewed) {
    return "已查看答案";
  }

  return "未完成";
}
