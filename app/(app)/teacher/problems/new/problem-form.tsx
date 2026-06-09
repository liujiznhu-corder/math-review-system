"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { LatexProblemRenderer } from "@/components/problems/LatexProblemRenderer";
import { saveProblem } from "./actions";

type ProblemType = "single_choice" | "fill_blank" | "calculation";

type QuestionTypeOption = {
  id: string;
  level1: string;
  level2: string;
  level3: string;
};

type ProblemFormProps = {
  message?: string;
  questionTypes: QuestionTypeOption[];
};

const sampleLatex =
  "若函数$f(x)$在$x=1$处连续,且$\\lim\\limits_{x \\to 1}\\frac{f(x)}{x-1}=2,$则$\\lim\\limits_{x \\to 0}\\frac{f(1-2x)}{x}=$\\blankbox\n\\fourchoices\n{$-4$}{$-1$}{$1$}{$4$}";

export function ProblemForm({ message, questionTypes }: ProblemFormProps) {
  const [problemType, setProblemType] =
    useState<ProblemType>("single_choice");
  const [rawLatex, setRawLatex] = useState(sampleLatex);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <form action={saveProblem} className="rounded-md border border-ink/10 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-ink">原生 LaTeX 题目</h2>
          <p className="mt-2 text-sm leading-6 text-ink/65">
            `raw_latex` 会原样保存，用于后续导出。系统只在分类和预览时解析自定义命令。
          </p>
        </div>

        {message ? (
          <p className="mt-5 rounded-md border border-moss/20 bg-moss/5 px-3 py-2 text-sm text-moss">
            {message}
          </p>
        ) : null}

        <label className="mt-5 block text-sm font-medium text-ink">
          题目类型
          <select
            name="problemType"
            value={problemType}
            onChange={(event) =>
              setProblemType(event.target.value as ProblemType)
            }
            className="mt-2 h-10 w-full rounded-md border border-ink/15 bg-white px-3 text-sm outline-none focus:border-moss"
          >
            <option value="single_choice">单选题</option>
            <option value="fill_blank">填空题</option>
            <option value="calculation">计算题</option>
          </select>
        </label>

        <label className="mt-4 block text-sm font-medium text-ink">
          所属题型
          <select
            name="questionTypeId"
            className="mt-2 h-10 w-full rounded-md border border-ink/15 bg-white px-3 text-sm outline-none focus:border-moss"
          >
            <option value="">暂不指定题型</option>
            {questionTypes.map((questionType) => (
              <option key={questionType.id} value={questionType.id}>
                {questionType.level1} / {questionType.level2} /{" "}
                {questionType.level3}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-4 block text-sm font-medium text-ink">
          raw_latex
          <textarea
            name="rawLatex"
            required
            rows={14}
            value={rawLatex}
            onChange={(event) => setRawLatex(event.target.value)}
            className="mt-2 w-full rounded-md border border-ink/15 px-3 py-2 font-mono text-sm leading-6 outline-none focus:border-moss"
          />
        </label>

        <TextArea name="source" label="来源" rows={2} className="mt-4" />

        <div className="mt-5">
          <button
            type="submit"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-moss px-4 text-sm font-medium text-white"
          >
            <Save className="h-4 w-4" />
            保存题目
          </button>
        </div>
      </form>

      <aside className="rounded-md border border-ink/10 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">实时预览</h2>
        <p className="mt-2 text-sm leading-6 text-ink/65">
          支持 `\\blankbox` 和 `\\fourchoices{"{A}"}{"{B}"}{"{C}"}{"{D}"}`。
        </p>
        <div className="mt-5 rounded-md border border-ink/10 bg-paper p-4">
          <LatexProblemRenderer rawLatex={rawLatex} />
        </div>
      </aside>
    </div>
  );
}

function TextArea({
  name,
  label,
  rows,
  className = ""
}: {
  name: string;
  label: string;
  rows: number;
  className?: string;
}) {
  return (
    <label className={`block text-sm font-medium text-ink ${className}`}>
      {label}
      <textarea
        name={name}
        rows={rows}
        className="mt-2 w-full rounded-md border border-ink/15 px-3 py-2 text-sm leading-6 outline-none focus:border-moss"
      />
    </label>
  );
}
