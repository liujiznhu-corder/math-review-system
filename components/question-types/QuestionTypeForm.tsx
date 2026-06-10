"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Save, Trash2 } from "lucide-react";
import { LatexProblemRenderer } from "@/components/problems/LatexProblemRenderer";
import { SubmitButton } from "@/components/submit-button";

export type QuestionTypeFormValue = {
  id?: string;
  level1?: string;
  level2?: string;
  level3?: string;
  keywords?: string[];
  description?: string | null;
  is_active?: boolean;
  examples?: {
    id: string;
    example_text: string;
    solution_hint?: string | null;
  }[];
};

type EditableExample = {
  key: string;
  exampleText: string;
  solutionHint: string;
};

type QuestionTypeFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  questionType?: QuestionTypeFormValue;
  submitLabel: string;
};

export function QuestionTypeForm({
  action,
  questionType,
  submitLabel
}: QuestionTypeFormProps) {
  const [examples, setExamples] = useState<EditableExample[]>(() =>
    initialExamples(questionType)
  );

  function updateExample(
    key: string,
    field: "exampleText" | "solutionHint",
    value: string
  ) {
    setExamples((current) =>
      current.map((example) =>
        example.key === key ? { ...example, [field]: value } : example
      )
    );
  }

  function addExample() {
    setExamples((current) => [
      ...current,
      { key: crypto.randomUUID(), exampleText: "", solutionHint: "" }
    ]);
  }

  function removeExample(key: string) {
    setExamples((current) =>
      current.length > 1
        ? current.filter((example) => example.key !== key)
        : [{ key: crypto.randomUUID(), exampleText: "", solutionHint: "" }]
    );
  }

  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="id" value={questionType?.id ?? ""} />

      <div className="grid gap-4 md:grid-cols-3">
        <TextField
          label="一级分类"
          name="level1"
          defaultValue={questionType?.level1}
          placeholder="高等数学"
          required
        />
        <TextField
          label="二级分类"
          name="level2"
          defaultValue={questionType?.level2}
          placeholder="一元函数微分学"
          required
        />
        <TextField
          label="三级题型"
          name="level3"
          defaultValue={questionType?.level3}
          placeholder="导数定义求极限"
          required
        />
      </div>

      <label className="block text-sm font-medium text-ink">
        题型说明 / 适用场景
        <textarea
          name="description"
          rows={3}
          defaultValue={questionType?.description ?? ""}
          placeholder="说明这个题型通常如何识别、适用于什么场景、解题入口是什么。"
          className="mt-2 w-full rounded-md border border-ink/15 px-3 py-2 text-sm leading-6 outline-none focus:border-moss"
        />
      </label>

      <label className="block text-sm font-medium text-ink">
        题型识别特征（可选）
        <textarea
          name="keywords"
          rows={5}
          defaultValue={questionType?.keywords?.join("\n") ?? ""}
          placeholder={[
            "每行填写一个识别特征，例如：",
            "f(x+h)-f(x)",
            "h→0",
            "[f(x)-f(a)]/(x-a)",
            "极限式可转化为导数定义"
          ].join("\n")}
          className="mt-2 w-full rounded-md border border-ink/15 px-3 py-2 font-mono text-sm leading-6 outline-none focus:border-moss"
        />
      </label>

      <label className="inline-flex items-center gap-2 text-sm font-medium text-ink">
        <input
          type="checkbox"
          name="isActive"
          value="true"
          defaultChecked={questionType?.is_active ?? true}
          className="h-4 w-4 rounded border-ink/20 text-moss"
        />
        启用该题型
      </label>

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-ink">代表例题</h3>
            <p className="mt-1 text-xs text-ink/55">
              支持原生 LaTeX、自定义 blankbox/fourchoices，并实时预览。
            </p>
          </div>
          <button
            type="button"
            onClick={addExample}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-ink/15 bg-white px-3 text-sm font-medium text-ink"
          >
            <Plus className="h-4 w-4" />
            添加例题
          </button>
        </div>

        {examples.map((example, index) => (
          <article
            key={example.key}
            className="grid gap-4 rounded-md border border-ink/10 bg-paper p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
          >
            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-medium text-ink">
                  例题 {index + 1}
                </h4>
                <button
                  type="button"
                  onClick={() => removeExample(example.key)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-clay/20 text-clay hover:bg-clay/10"
                  title="删除例题"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <textarea
                name="exampleText"
                rows={7}
                value={example.exampleText}
                onChange={(event) =>
                  updateExample(example.key, "exampleText", event.target.value)
                }
                placeholder="输入代表例题 LaTeX 源码"
                className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 font-mono text-sm leading-6 outline-none focus:border-moss"
              />
              <textarea
                name="solutionHint"
                rows={3}
                value={example.solutionHint}
                onChange={(event) =>
                  updateExample(example.key, "solutionHint", event.target.value)
                }
                placeholder="例题提示 / 解题入口（可选）"
                className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-moss"
              />
            </div>
            <div className="rounded-md border border-ink/10 bg-white p-4">
              <p className="mb-3 text-xs font-medium text-ink/55">实时预览</p>
              <LatexProblemRenderer
                rawLatex={example.exampleText}
                fallback="输入例题后显示预览"
              />
            </div>
          </article>
        ))}
      </section>

      <div className="flex flex-wrap gap-3">
        <SubmitButton
          pendingText="保存中..."
          className="inline-flex h-10 items-center gap-2 rounded-md bg-moss px-4 text-sm font-medium text-white"
        >
          <Save className="h-4 w-4" />
          {submitLabel}
        </SubmitButton>
        <Link
          href="/question-types"
          className="inline-flex h-10 items-center rounded-md border border-ink/15 bg-white px-4 text-sm font-medium text-ink"
        >
          返回列表
        </Link>
      </div>
    </form>
  );
}

function TextField({
  label,
  name,
  defaultValue,
  placeholder,
  required
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-ink">
      {label}
      <input
        name={name}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-2 h-10 w-full rounded-md border border-ink/15 px-3 text-sm outline-none focus:border-moss"
      />
    </label>
  );
}

function initialExamples(
  questionType: QuestionTypeFormValue | undefined
): EditableExample[] {
  const examples = questionType?.examples ?? [];

  if (examples.length === 0) {
    return [{ key: "example-0", exampleText: "", solutionHint: "" }];
  }

  return examples.map((example, index) => ({
    key: example.id || `example-${index}`,
    exampleText: example.example_text,
    solutionHint: example.solution_hint ?? ""
  }));
}
