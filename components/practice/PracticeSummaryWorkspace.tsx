"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ArrowRight, Home, PlusCircle, RotateCcw } from "lucide-react";
import { LatexProblemRenderer } from "@/components/problems/LatexProblemRenderer";
import type {
  PracticeRecordView,
  PracticeSessionView
} from "@/services/student/practice";

type PracticeSummaryWorkspaceProps = {
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

type AddMistakesResult = {
  createdMistakes: Array<{
    recordId: string;
    problemId: string;
    mistakeId: string;
  }>;
  skippedRecords: Array<{
    recordId: string;
    problemId: string | null;
    reason: string;
    mistakeId: string | null;
  }>;
};

export function PracticeSummaryWorkspace({
  initialSession
}: PracticeSummaryWorkspaceProps) {
  const [session, setSession] = useState(initialSession);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const notMasteredRecords = session.records.filter(
    (record) => record.result === "not_mastered"
  );
  const masteredCount = session.records.filter(
    (record) => record.result === "mastered"
  ).length;
  const selectableRecordIds = useMemo(
    () =>
      notMasteredRecords
        .filter((record) => !record.createdMistakeId && !record.addedToMistakesAt)
        .map((record) => record.id),
    [notMasteredRecords]
  );
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(
    () => new Set(selectableRecordIds)
  );

  function toggleSelected(recordId: string) {
    setSelectedRecordIds((current) => {
      const next = new Set(current);

      if (next.has(recordId)) {
        next.delete(recordId);
      } else {
        next.add(recordId);
      }

      return next;
    });
  }

  function selectAll() {
    setSelectedRecordIds(new Set(selectableRecordIds));
  }

  function clearSelected() {
    setSelectedRecordIds(new Set());
  }

  function addSelectedMistakes() {
    const recordIds = Array.from(selectedRecordIds);

    if (recordIds.length === 0) {
      setMessage("请至少选择一道题。");
      return;
    }

    setMessage("");
    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/student/practice/sessions/${session.id}/add-mistakes`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ recordIds })
          }
        );
        const payload = (await response.json()) as
          | ApiSuccess<AddMistakesResult>
          | ApiFailure;

        if (!payload.ok) {
          throw new Error(payload.error.message);
        }

        const nextSession = await reloadSession();
        setSession(nextSession);
        setSelectedRecordIds(new Set());
        setMessage(
          `已加入 ${payload.data.createdMistakes.length} 题，跳过 ${payload.data.skippedRecords.length} 题。`
        );
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "加入错题库失败");
      }
    });
  }

  async function reloadSession() {
    const response = await fetch(`/api/student/practice/sessions/${session.id}`);
    const payload = (await response.json()) as
      | ApiSuccess<PracticeSessionView>
      | ApiFailure;

    if (!payload.ok) {
      throw new Error(payload.error.message);
    }

    return payload.data;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-ink/10 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-medium text-clay">训练完成</p>
            <h1 className="mt-1 text-2xl font-semibold text-ink">
              本次训练总结
            </h1>
            <p className="mt-2 text-sm text-ink/65">
              完成时间：{formatDateTime(session.completedAt ?? new Date().toISOString())}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <Metric label="总题数" value={session.records.length} />
            <Metric label="已掌握" value={masteredCount} />
            <Metric label="未掌握" value={notMasteredRecords.length} />
          </div>
        </div>
      </section>

      {message ? (
        <p className="rounded-md border border-moss/20 bg-white px-4 py-3 text-sm text-moss">
          {message}
        </p>
      ) : null}

      <section className="rounded-md border border-ink/10 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">未掌握题目</h2>
            <p className="mt-1 text-sm text-ink/55">
              只把你想继续复盘的题加入错题库。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={selectAll}
              disabled={selectableRecordIds.length === 0}
              className="h-9 rounded-md border border-ink/15 bg-white px-3 text-sm text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              全选
            </button>
            <button
              type="button"
              onClick={clearSelected}
              className="h-9 rounded-md border border-ink/15 bg-white px-3 text-sm text-ink"
            >
              取消全选
            </button>
            <button
              type="button"
              onClick={addSelectedMistakes}
              disabled={isPending || selectedRecordIds.size === 0}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-clay px-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PlusCircle className="h-4 w-4" />
              加入选中的错题库
            </button>
          </div>
        </div>

        {notMasteredRecords.length === 0 ? (
          <div className="mt-5 rounded-md border border-dashed border-ink/20 bg-paper px-5 py-10 text-center text-sm text-ink/60">
            这次没有未掌握题目，状态很好。
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {notMasteredRecords.map((record) => (
              <NotMasteredRecordItem
                key={record.id}
                record={record}
                selected={selectedRecordIds.has(record.id)}
                onToggle={() => toggleSelected(record.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-wrap gap-3">
        <Link
          href="/practice"
          className="inline-flex h-10 items-center gap-2 rounded-md border border-ink/15 bg-white px-4 text-sm font-medium text-ink"
        >
          <RotateCcw className="h-4 w-4" />
          再练一次
        </Link>
        <Link
          href="/practice"
          className="inline-flex h-10 items-center gap-2 rounded-md border border-ink/15 bg-white px-4 text-sm font-medium text-ink"
        >
          <ArrowRight className="h-4 w-4" />
          返回专项训练
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-moss px-4 text-sm font-medium text-white"
        >
          <Home className="h-4 w-4" />
          返回首页
        </Link>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-20 rounded-md bg-paper px-4 py-3">
      <p className="text-xs text-ink/55">{label}</p>
      <p className="mt-1 text-xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function NotMasteredRecordItem({
  record,
  selected,
  onToggle
}: {
  record: PracticeRecordView;
  selected: boolean;
  onToggle: () => void;
}) {
  const alreadyAdded =
    Boolean(record.createdMistakeId) || Boolean(record.addedToMistakesAt);

  return (
    <article className="rounded-md border border-ink/10 bg-paper p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="inline-flex items-center gap-3 text-sm font-medium text-ink">
          <input
            type="checkbox"
            checked={selected}
            disabled={alreadyAdded}
            onChange={onToggle}
            className="h-4 w-4 accent-moss"
          />
          第 {record.position} 题
        </label>
        {alreadyAdded ? (
          record.createdMistakeId ? (
            <Link
              href={`/mistakes/${record.createdMistakeId}/answer?returnUrl=${encodeURIComponent("/practice")}`}
              className="text-sm font-medium text-moss"
            >
              已加入错题库
            </Link>
          ) : (
            <span className="text-sm font-medium text-moss">
              已加入错题库
            </span>
          )
        ) : (
          <span className="text-sm text-ink/50">可加入错题库</span>
        )}
      </div>
      <div className="mt-3">
        {record.problem ? (
          <LatexProblemRenderer rawLatex={record.problem.displayLatex} />
        ) : (
          <p className="text-sm text-ink/55">题目已不存在。</p>
        )}
      </div>
    </article>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
