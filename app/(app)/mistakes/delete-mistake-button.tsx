"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deleteMyMistake } from "@/app/(app)/mistakes/actions";

type DeleteMistakeButtonProps = {
  mistakeId: string;
  currentPage: number;
  itemsOnPage: number;
  searchParams: Record<string, string | undefined>;
};

export function DeleteMistakeButton({
  mistakeId,
  currentPage,
  itemsOnPage,
  searchParams
}: DeleteMistakeButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function closeDialog() {
    if (isPending) {
      return;
    }

    setOpen(false);
    setError("");
  }

  function handleDelete() {
    setError("");
    startTransition(async () => {
      const result = await deleteMyMistake(mistakeId);

      if (!result.ok) {
        setError(result.message || "删除失败，请稍后再试。");
        return;
      }

      const params = new URLSearchParams();

      for (const [key, value] of Object.entries(searchParams)) {
        if (value && key !== "page") {
          params.set(key, value);
        }
      }

      params.set("message", result.message);
      params.set(
        "page",
        String(itemsOnPage <= 1 && currentPage > 1 ? currentPage - 1 : currentPage)
      );
      params.set("pageSize", "5");

      setOpen(false);
      router.replace(`/mistakes?${params.toString()}`);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium text-ink/55 hover:bg-red-50 hover:text-red-700"
      >
        <Trash2 className="h-4 w-4" />
        删除
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-mistake-title"
        >
          <div className="w-full max-w-md rounded-xl border border-ink/10 bg-white p-6 shadow-xl">
            <h2
              id="delete-mistake-title"
              className="text-lg font-semibold text-ink"
            >
              确定删除这道错题吗？
            </h2>
            <p className="mt-3 text-sm leading-6 text-ink/70">
              删除后，它将从你的错题库和复习计划中移除，但不会影响老师题库中的题目。
            </p>

            {error ? (
              <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDialog}
                disabled={isPending}
                className="inline-flex h-10 items-center justify-center rounded-md border border-ink/15 px-4 text-sm font-medium text-ink disabled:cursor-not-allowed disabled:opacity-60"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-red-600 px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                确认删除
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
