"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, CheckCircle2, Eye, LoaderCircle, XCircle } from "lucide-react";
import { LatexContentRenderer } from "@/components/problems/LatexContentRenderer";
import { LatexProblemRenderer } from "@/components/problems/LatexProblemRenderer";
import type {
  PracticeRecordView,
  PracticeRecordSolutionView,
  PracticeSessionView
} from "@/services/student/practice";

type PracticeSessionWorkspaceProps = {
  initialSession: PracticeSessionView;
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

type RecordStatus = "pending" | "viewed" | "mastered" | "not_mastered";

export function PracticeSessionWorkspace({
  initialSession
}: PracticeSessionWorkspaceProps) {
  const router = useRouter();
  const [session, setSession] = useState(initialSession);
  const [activeRecordId, setActiveRecordId] = useState(
    initialSession.records.find((record) => !record.result)?.id ??
      initialSession.records[0]?.id ??
      ""
  );
  const [viewedRecordIds, setViewedRecordIds] = useState<Set<string>>(
    () => new Set()
  );
  const [message, setMessage] = useState("");
  const [solutionLoadingRecordId, setSolutionLoadingRecordId] = useState("");
  const [isPending, startTransition] = useTransition();

  const records = session.records;
  const activeRecord =
    records.find((record) => record.id === activeRecordId) ??
    records[0] ??
    null;
  const completedCount = records.filter((record) => Boolean(record.result)).length;

  async function loadAnswer(record: PracticeRecordView) {
    if (!record.problem) {
      return;
    }

    if (record.problem.solutionLoaded) {
      setViewedRecordIds((current) => new Set(current).add(record.id));
      return;
    }

    setMessage("");
    setSolutionLoadingRecordId(record.id);

    try {
      const response = await fetch(
        `/api/student/practice/records/${record.id}/solution`
      );
      const payload = (await response.json()) as
        | ApiSuccess<PracticeRecordSolutionView>
        | ApiFailure;

      if (!payload.ok) {
        throw new Error(payload.error.message);
      }

      setSession((current) => ({
        ...current,
        records: current.records.map((item) =>
          item.id === record.id && item.problem
            ? {
                ...item,
                problem: {
                  ...item.problem,
                  answer: payload.data.answer,
                  analysis: payload.data.analysis,
                  solutionLoaded: true
                }
              }
            : item
        )
      }));
      setViewedRecordIds((current) => new Set(current).add(record.id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "答案解析加载失败");
    } finally {
      setSolutionLoadingRecordId("");
    }
  }

  function moveToNextRecord(recordsToUse = records, current = activeRecord) {
    if (!current || recordsToUse.length === 0) {
      return;
    }

    const currentIndex = recordsToUse.findIndex(
      (record) => record.id === current.id
    );
    const ordered = [
      ...recordsToUse.slice(currentIndex + 1),
      ...recordsToUse.slice(0, currentIndex + 1)
    ];
    const nextUnfinished = ordered.find((record) => !record.result);
    const nextRecord = nextUnfinished ?? ordered[0] ?? recordsToUse[0];

    setActiveRecordId(nextRecord.id);
  }

  function completeRecord(record: PracticeRecordView, result: "mastered" | "not_mastered") {
    if (!viewedRecordIds.has(record.id)) {
      const confirmed = window.confirm("建议先查看答案后再判断掌握情况。仍要继续吗？");

      if (!confirmed) {
        return;
      }
    }

    setMessage("");
    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/student/practice/records/${record.id}/complete`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ result })
          }
        );
        const payload = (await response.json()) as
          | ApiSuccess<PracticeSessionView>
          | ApiFailure;

        if (!payload.ok) {
          throw new Error(payload.error.message);
        }

        setSession((current) => mergeLoadedSolutions(payload.data, current));

        const finished = payload.data.records.every(
          (item) => item.result === "mastered" || item.result === "not_mastered"
        );

        if (finished) {
          router.push(`/practice/session/${payload.data.id}/summary`);
          return;
        }

        moveToNextRecord(payload.data.records, record);
        setMessage("训练记录已更新，已自动切到下一题。");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "训练记录更新失败");
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-ink/10 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm text-ink/55">训练题型</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">
              {session.questionType
                ? `${session.questionType.level1} / ${session.questionType.level2} / ${session.questionType.level3}`
                : "未指定题型"}
            </h2>
            {session.hasSupplementedProblems ? (
              <p className="mt-2 text-sm text-clay">
                该题型题量不足，已为你补充相近题型。
              </p>
            ) : null}
          </div>
          <div className="rounded-md bg-paper px-4 py-3 text-sm text-ink/65">
            进度：
            <span className="font-semibold text-ink">
              {completedCount} / {records.length}
            </span>
          </div>
        </div>
      </section>

      {message ? (
        <p className="rounded-md border border-moss/20 bg-white px-4 py-3 text-sm text-moss">
          {message}
        </p>
      ) : null}

      <QuestionNavigator
        records={records}
        activeRecordId={activeRecord?.id}
        viewedRecordIds={viewedRecordIds}
        onSelect={setActiveRecordId}
      />

      {activeRecord ? (
        <PracticeRecordDetail
          record={activeRecord}
          answerViewed={viewedRecordIds.has(activeRecord.id)}
          answerLoading={solutionLoadingRecordId === activeRecord.id}
          disabled={isPending}
          onViewAnswer={() => loadAnswer(activeRecord)}
          onComplete={(result) => completeRecord(activeRecord, result)}
          onNext={() => moveToNextRecord()}
        />
      ) : (
        <div className="rounded-md border border-dashed border-ink/20 bg-white px-5 py-10 text-center text-sm text-ink/60">
          本次专项训练暂无题目。
        </div>
      )}
    </div>
  );
}

function QuestionNavigator({
  records,
  activeRecordId,
  viewedRecordIds,
  onSelect
}: {
  records: PracticeRecordView[];
  activeRecordId?: string;
  viewedRecordIds: Set<string>;
  onSelect: (recordId: string) => void;
}) {
  return (
    <section className="rounded-md border border-ink/10 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-ink">题目列表</h2>
        <p className="text-sm text-ink/55">可以自由切换任意题目。</p>
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {records.map((record) => {
          const status = getRecordStatus(record, viewedRecordIds.has(record.id));

          return (
            <button
              key={record.id}
              type="button"
              onClick={() => onSelect(record.id)}
              className={[
                "min-h-16 min-w-28 shrink-0 rounded-md border px-3 py-2 text-left text-sm transition",
                getNavigatorClassName(status, record.id === activeRecordId)
              ].join(" ")}
            >
              <p className="font-medium">第{record.position}题</p>
              <p className="mt-1 text-xs">{getStatusLabel(status)}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function PracticeRecordDetail({
  record,
  answerViewed,
  answerLoading,
  disabled,
  onViewAnswer,
  onComplete,
  onNext
}: {
  record: PracticeRecordView;
  answerViewed: boolean;
  answerLoading: boolean;
  disabled: boolean;
  onViewAnswer: () => void;
  onComplete: (result: "mastered" | "not_mastered") => void;
  onNext: () => void;
}) {
  const status = getRecordStatus(record, answerViewed);

  return (
    <article className="rounded-md border border-ink/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-ink/55">第 {record.position} / 5 题</p>
          <h2 className="mt-1 text-base font-semibold text-ink">
            {record.problem?.questionType
              ? `${record.problem.questionType.level1} / ${record.problem.questionType.level2} / ${record.problem.questionType.level3}`
              : "未指定题型"}
          </h2>
        </div>
        <span className={getStatusBadgeClassName(status)}>
          {getStatusLabel(status)}
        </span>
      </div>

      <div className="mt-5 max-w-full overflow-x-auto rounded-md bg-paper p-4">
        {record.problem ? (
          <LatexProblemRenderer rawLatex={record.problem.displayLatex} />
        ) : (
          <p className="text-sm text-ink/55">题目已不存在。</p>
        )}
      </div>

      {record.problem ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={onViewAnswer}
            disabled={answerLoading}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-moss/25 bg-white px-4 text-sm font-medium text-moss disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:w-auto"
          >
            {answerLoading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            {answerLoading ? "加载中" : "查看答案"}
          </button>

          {answerViewed ? (
            record.problem.answer?.trim() || record.problem.analysis?.trim() ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <section className="max-w-full overflow-x-auto rounded-md bg-paper p-4">
                  <h3 className="text-sm font-semibold text-ink">答案</h3>
                  <div className="mt-3">
                    <LatexContentRenderer
                      content={record.problem.answer}
                      fallback="暂无答案"
                    />
                  </div>
                </section>
                <section className="max-w-full overflow-x-auto rounded-md bg-paper p-4">
                  <h3 className="text-sm font-semibold text-ink">解析</h3>
                  <div className="mt-3">
                    <LatexContentRenderer
                      content={record.problem.analysis}
                      fallback="暂无解析"
                    />
                  </div>
                </section>
              </div>
            ) : (
              <p className="mt-4 rounded-md bg-paper px-4 py-3 text-sm text-ink/60">
                答案解析暂未补充，请等待老师更新。
              </p>
            )
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onComplete("mastered")}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-moss px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 sm:h-10"
        >
          <CheckCircle2 className="h-4 w-4" />
          已掌握
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onComplete("not_mastered")}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-clay/25 bg-clay/10 px-4 text-sm font-medium text-clay disabled:cursor-not-allowed disabled:opacity-50 sm:h-10"
        >
          <XCircle className="h-4 w-4" />
          未掌握
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

function mergeLoadedSolutions(
  nextSession: PracticeSessionView,
  currentSession: PracticeSessionView
) {
  const loadedSolutions = new Map(
    currentSession.records
      .filter((record) => record.problem?.solutionLoaded)
      .map((record) => [
        record.id,
        {
          answer: record.problem?.answer ?? null,
          analysis: record.problem?.analysis ?? null
        }
      ])
  );

  return {
    ...nextSession,
    records: nextSession.records.map((record) => {
      const loaded = loadedSolutions.get(record.id);

      if (!loaded || !record.problem) {
        return record;
      }

      return {
        ...record,
        problem: {
          ...record.problem,
          ...loaded,
          solutionLoaded: true
        }
      };
    })
  };
}

function getRecordStatus(record: PracticeRecordView, answerViewed: boolean): RecordStatus {
  if (record.result === "mastered") {
    return "mastered";
  }

  if (record.result === "not_mastered") {
    return "not_mastered";
  }

  if (answerViewed) {
    return "viewed";
  }

  return "pending";
}

function getStatusLabel(status: RecordStatus) {
  const labels: Record<RecordStatus, string> = {
    pending: "未完成",
    viewed: "已查看答案",
    mastered: "已掌握",
    not_mastered: "未掌握"
  };

  return labels[status];
}

function getNavigatorClassName(status: RecordStatus, active: boolean) {
  if (status === "mastered") {
    return active
      ? "border-moss bg-moss/15 text-moss"
      : "border-moss/25 bg-moss/10 text-moss";
  }

  if (status === "not_mastered") {
    return active
      ? "border-clay bg-clay/15 text-clay"
      : "border-clay/25 bg-clay/10 text-clay";
  }

  if (status === "viewed") {
    return active
      ? "border-ink/30 bg-paper text-ink"
      : "border-ink/10 bg-paper text-ink/65";
  }

  return active
    ? "border-moss bg-white text-ink shadow-sm"
    : "border-ink/10 bg-white text-ink/60";
}

function getStatusBadgeClassName(status: RecordStatus) {
  const base = "rounded-md px-3 py-2 text-sm";

  if (status === "mastered") {
    return `${base} bg-moss/10 text-moss`;
  }

  if (status === "not_mastered") {
    return `${base} bg-clay/10 text-clay`;
  }

  if (status === "viewed") {
    return `${base} bg-paper text-ink/65`;
  }

  return `${base} border border-ink/10 bg-white text-ink/55`;
}
