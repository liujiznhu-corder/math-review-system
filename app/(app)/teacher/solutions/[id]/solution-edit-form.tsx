"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { LatexContentRenderer } from "@/components/problems/LatexContentRenderer";
import { updateSolution } from "../actions";

type SolutionEditFormProps = {
  problemId: string;
  initialAnswer: string | null;
  initialAnalysis: string | null;
};

export function SolutionEditForm({
  problemId,
  initialAnswer,
  initialAnalysis
}: SolutionEditFormProps) {
  const [answer, setAnswer] = useState(initialAnswer ?? "");
  const [analysis, setAnalysis] = useState(initialAnalysis ?? "");

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <form
        action={updateSolution}
        className="rounded-md border border-ink/10 bg-white p-5 shadow-sm"
      >
        <input type="hidden" name="problemId" value={problemId} />
        <div>
          <h2 className="text-lg font-semibold text-ink">编辑答案解析</h2>
          <p className="mt-2 text-sm leading-6 text-ink/65">
            答案支持普通文本和 LaTeX；解析支持 Markdown 风格文本和 LaTeX 公式。
          </p>
        </div>

        <label className="mt-5 block text-sm font-medium text-ink">
          答案
          <textarea
            name="answer"
            rows={4}
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="例如 $2$ 或 $\\frac{1}{2}$"
            className="mt-2 w-full rounded-md border border-ink/15 px-3 py-2 font-mono text-sm leading-6 outline-none focus:border-moss"
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-ink">
          解析
          <textarea
            name="analysis"
            rows={12}
            value={analysis}
            onChange={(event) => setAnalysis(event.target.value)}
            placeholder={"先利用重要极限：\n\n$$\n\\lim_{x \\to 0}\\frac{\\sin x}{x}=1\n$$\n\n然后代入求解。"}
            className="mt-2 w-full rounded-md border border-ink/15 px-3 py-2 font-mono text-sm leading-6 outline-none focus:border-moss"
          />
        </label>

        <div className="mt-5">
          <button
            type="submit"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-moss px-4 text-sm font-medium text-white"
          >
            <Save className="h-4 w-4" />
            保存答案解析
          </button>
        </div>
      </form>

      <aside className="space-y-4">
        <PreviewPanel title="答案预览">
          <LatexContentRenderer content={answer} fallback="暂未填写答案" />
        </PreviewPanel>
        <PreviewPanel title="解析预览">
          <LatexContentRenderer content={analysis} fallback="暂未填写解析" />
        </PreviewPanel>
      </aside>
    </div>
  );
}

function PreviewPanel({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-ink/10 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <div className="mt-4 rounded-md bg-paper p-4">{children}</div>
    </section>
  );
}
