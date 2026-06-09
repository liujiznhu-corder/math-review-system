"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, Send, Save, Sparkles } from "lucide-react";
import {
  recommendQuestionTypes,
  saveMistake,
  type RecommendedQuestionType
} from "@/app/(app)/mistakes/actions";
import { LatexProblemRenderer } from "@/components/problems/LatexProblemRenderer";
import type { SelectableQuestionType } from "@/services/student/mistakes";
import type { MistakeInputType } from "@/services/latex";

type MistakeEntryFormProps = {
  message?: string;
  questionTypes: SelectableQuestionType[];
};

export function MistakeEntryForm({
  message,
  questionTypes
}: MistakeEntryFormProps) {
  const [inputType, setInputType] = useState<MistakeInputType>("plain_text");
  const [rawText, setRawText] = useState("");
  const [latexContent, setLatexContent] = useState("");
  const [selectedQuestionTypeId, setSelectedQuestionTypeId] = useState("");
  const [recommendations, setRecommendations] = useState<
    RecommendedQuestionType[]
  >([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const canSave = useMemo(
    () => getActiveInput(inputType, rawText, latexContent).length > 0 && selectedQuestionTypeId.length > 0,
    [inputType, latexContent, rawText, selectedQuestionTypeId]
  );

  function handleRecommend() {
    setErrorMessage("");
    setSelectedQuestionTypeId("");

    startTransition(async () => {
      try {
        const results = await recommendQuestionTypes({
          inputType,
          rawText,
          latexContent
        });
          setRecommendations(results);

        if (results.length === 0) {
          setErrorMessage("题型库为空或暂无可推荐题型，请先维护题型库。");
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "推荐题型时发生未知错误"
        );
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <form action={saveMistake} className="rounded-md border border-ink/10 bg-white p-5 shadow-sm">
        <input type="hidden" name="questionTypeId" value={selectedQuestionTypeId} />
        <input type="hidden" name="inputType" value={inputType} />
        <div>
          <h2 className="text-lg font-semibold text-ink">录入错题</h2>
          <p className="mt-2 text-sm leading-6 text-ink/65">
            第一版不接 OCR。可粘贴普通文本，也可粘贴外部工具转写后的 LaTeX。
          </p>
        </div>

        {message ? (
          <p className="mt-5 rounded-md border border-clay/30 bg-clay/10 px-3 py-2 text-sm text-clay">
            {message}
          </p>
        ) : null}

        <div className="mt-5">
          <p className="text-sm font-medium text-ink">输入类型</p>
          <div className="mt-2 inline-flex rounded-md border border-ink/15 bg-paper p-1">
            <button
              type="button"
              onClick={() => setInputType("plain_text")}
              className={`h-9 rounded px-3 text-sm font-medium ${
                inputType === "plain_text"
                  ? "bg-white text-ink shadow-sm"
                  : "text-ink/60"
              }`}
            >
              普通文本
            </button>
            <button
              type="button"
              onClick={() => setInputType("latex")}
              className={`h-9 rounded px-3 text-sm font-medium ${
                inputType === "latex"
                  ? "bg-white text-ink shadow-sm"
                  : "text-ink/60"
              }`}
            >
              LaTeX
            </button>
          </div>
        </div>

        {inputType === "plain_text" ? (
          <label className="mt-5 block text-sm font-medium text-ink">
            题干
            <textarea
              name="rawText"
              required={inputType === "plain_text"}
              rows={10}
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              placeholder="请手动输入错题题干。"
              className="mt-2 w-full rounded-md border border-ink/15 px-3 py-2 text-sm leading-6 outline-none focus:border-moss"
            />
          </label>
        ) : (
          <div className="mt-5 grid gap-4">
            <label className="block text-sm font-medium text-ink">
              LaTeX 题干
              <textarea
                name="latexContent"
                required={inputType === "latex"}
                rows={10}
                value={latexContent}
                onChange={(event) => setLatexContent(event.target.value)}
                placeholder={"可粘贴如：求极限 $\\lim_{x\\to0}\\frac{\\sin x}{x}$。"}
                className="mt-2 w-full rounded-md border border-ink/15 px-3 py-2 font-mono text-sm leading-6 outline-none focus:border-moss"
              />
            </label>
            <div className="rounded-md border border-ink/10 bg-paper p-4">
              <p className="mb-3 text-sm font-medium text-ink">实时预览</p>
              <LatexProblemRenderer
                rawLatex={latexContent}
                fallback="输入 LaTeX 后显示预览"
              />
            </div>
          </div>
        )}

        <label className="mt-4 block text-sm font-medium text-ink">
          最终题型
          <select
            name="manualQuestionTypeId"
            value={selectedQuestionTypeId}
            onChange={(event) => setSelectedQuestionTypeId(event.target.value)}
            className="mt-2 h-10 w-full rounded-md border border-ink/15 bg-white px-3 text-sm outline-none focus:border-moss"
          >
            <option value="">从推荐结果选择，或手动选择已有题型</option>
            {questionTypes.map((questionType) => (
              <option key={questionType.id} value={questionType.id}>
                {questionType.level1} / {questionType.level2} /{" "}
                {questionType.level3}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-4 block text-sm font-medium text-ink">
          备注
          <textarea
            name="note"
            rows={4}
            placeholder="可记录错误原因、解题卡点或复盘提醒。"
            className="mt-2 w-full rounded-md border border-ink/15 px-3 py-2 text-sm leading-6 outline-none focus:border-moss"
          />
        </label>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleRecommend}
            disabled={
              isPending ||
              getActiveInput(inputType, rawText, latexContent).length === 0
            }
            className="inline-flex h-10 items-center gap-2 rounded-md bg-moss px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-55"
          >
            <Sparkles className="h-4 w-4" />
            {isPending ? "推荐中" : "智能推荐题型"}
          </button>
          <button
            type="submit"
            name="intent"
            value="save"
            disabled={!canSave}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-ink/15 bg-white px-4 text-sm font-medium text-ink disabled:cursor-not-allowed disabled:opacity-55"
          >
            <Save className="h-4 w-4" />
            保存错题
          </button>
          <button
            type="submit"
            name="intent"
            value="submit_review"
            disabled={getActiveInput(inputType, rawText, latexContent).length === 0}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-clay/25 bg-clay/10 px-4 text-sm font-medium text-clay disabled:cursor-not-allowed disabled:opacity-55"
          >
            <Send className="h-4 w-4" />
            提交教师审核
          </button>
        </div>
      </form>

      <aside className="rounded-md border border-ink/10 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">推荐题型</h2>
        <p className="mt-2 text-sm leading-6 text-ink/65">
          推荐结果来自数据库题型库，通过关键词命中和例题文本相似度计算。
        </p>

        {errorMessage ? (
          <p className="mt-5 rounded-md border border-clay/30 bg-clay/10 px-3 py-2 text-sm text-clay">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-5 space-y-3">
          {recommendations.length === 0 && !errorMessage ? (
            <div className="rounded-md border border-dashed border-ink/20 bg-paper px-4 py-8 text-center text-sm text-ink/60">
              点击智能推荐后显示最可能的 3 个题型。
            </div>
          ) : null}

          {recommendations.map((recommendation, index) => {
            const selected =
              recommendation.questionTypeId === selectedQuestionTypeId;

            return (
              <button
                key={recommendation.questionTypeId}
                type="button"
                onClick={() =>
                  setSelectedQuestionTypeId(recommendation.questionTypeId)
                }
                className={`w-full rounded-md border p-4 text-left transition ${
                  selected
                    ? "border-moss bg-moss/10"
                    : "border-ink/10 bg-paper hover:border-moss/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-clay">
                      推荐 {index + 1}
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-ink">
                      {recommendation.level3}
                    </h3>
                    <p className="mt-1 text-sm text-ink/60">
                      {recommendation.level1} / {recommendation.level2}
                    </p>
                  </div>
                  {selected ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-moss" />
                  ) : null}
                </div>

                <p className="mt-3 text-sm font-medium text-ink">
                  匹配分数：{recommendation.score}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(recommendation.reasons.length > 0
                    ? recommendation.reasons
                    : ["暂无明显匹配理由"]
                  ).map((reason) => (
                    <span
                      key={reason}
                      className="rounded-md bg-white px-2 py-1 text-xs text-ink/70"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

function getActiveInput(
  inputType: MistakeInputType,
  rawText: string,
  latexContent: string
) {
  return inputType === "latex" ? latexContent.trim() : rawText.trim();
}
