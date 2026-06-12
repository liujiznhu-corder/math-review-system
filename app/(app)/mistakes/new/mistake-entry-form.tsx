"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Bot,
  CheckCircle2,
  ClipboardCopy,
  Send,
  Save,
  Sparkles,
  X
} from "lucide-react";
import {
  recommendQuestionTypes,
  saveMistake,
  type RecommendedQuestionType
} from "@/app/(app)/mistakes/actions";
import { LatexProblemRenderer } from "@/components/problems/LatexProblemRenderer";
import type { SelectableQuestionType } from "@/services/student/mistakes";

type MistakeEntryFormProps = {
  message?: string;
  questionTypes: SelectableQuestionType[];
};

type PromptType = "single_choice" | "fill_blank" | "calculation";

type PromptTemplate = {
  type: PromptType;
  label: string;
  title: string;
  description: string;
  prompt: string;
};

const latexPlaceholder = String.raw`若函数$f(x)$在$x=1$处连续,且$\lim\limits_{x \to 1}\frac{f(x)}{x-1}=2,$则$\lim\limits_{x \to 0}\frac{f(1-2x)}{x}=$\blankbox
\fourchoices
{$-4$}{$-1$}{$1$}{$4$}`;

const promptTemplates: PromptTemplate[] = [
  {
    type: "single_choice",
    label: "单选题",
    title: "单选题 LaTeX 转写提示词",
    description: "适合包含 A/B/C/D 四个选项的选择题，输出可直接粘贴进本系统。",
    prompt: String.raw`请将我提供的数学题图片或文字转换为可直接粘贴到系统中的 LaTeX 代码。

要求：
1. 只输出题目代码，不输出解释。
2. 保留题干中的数学公式。
3. 选择题空格统一使用 \blankbox。
4. 四个选项必须使用：
\fourchoices
{选项A}{选项B}{选项C}{选项D}
5. 选项内容如果是数学公式，请使用 $...$ 包裹。
6. 不要输出答案。
7. 不要输出解析。
8. 不要使用 JSON。
9. 不要使用 Markdown 代码块。

输出格式示例：
若函数$f(x)$在$x=1$处连续,且$\lim\limits_{x \to 1}\frac{f(x)}{x-1}=2,$则$\lim\limits_{x \to 0}\frac{f(1-2x)}{x}=$\blankbox
\fourchoices
{$-4$}{$-1$}{$1$}{$4$}`
  },
  {
    type: "fill_blank",
    label: "填空题",
    title: "填空题 LaTeX 转写提示词",
    description: "适合没有选项、需要填写一个或多个空的题目。",
    prompt: String.raw`请将我提供的数学题图片或文字转换为可直接粘贴到系统中的 LaTeX 代码。

要求：
1. 只输出题目代码，不输出解释。
2. 保留题干中的数学公式。
3. 填空位置统一使用 \_\_\_。
4. 不要输出答案。
5. 不要输出解析。
6. 不要使用 JSON。
7. 不要使用 Markdown 代码块。

输出格式示例：
已知曲线$f(x)=\dfrac{e^x-1}{x-a}$有垂直渐近线$x=3$，则$a=$\_\_\_`
  },
  {
    type: "calculation",
    label: "计算题",
    title: "计算题 LaTeX 转写提示词",
    description: "适合极限、导数、积分、证明等需要完整保留条件的题目。",
    prompt: String.raw`请将我提供的数学题图片或文字转换为可直接粘贴到系统中的 LaTeX 代码。

要求：
1. 只输出题目代码，不输出解释。
2. 保留题干中的数学公式。
3. 不要输出答案。
4. 不要输出解析。
5. 不要使用 JSON。
6. 不要使用 Markdown 代码块。
7. 如果题目是求极限、求导、积分、证明题，请完整保留题目条件。

输出格式示例：
求极限：
$\lim\limits_{x \to 0}\dfrac{e^{x-\sin x}-1}{\arcsin x^3}$`
  }
];

export function MistakeEntryForm({
  message,
  questionTypes
}: MistakeEntryFormProps) {
  const [latexContent, setLatexContent] = useState("");
  const [selectedQuestionTypeId, setSelectedQuestionTypeId] = useState("");
  const [recommendations, setRecommendations] = useState<
    RecommendedQuestionType[]
  >([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [selectedPromptType, setSelectedPromptType] =
    useState<PromptType>("single_choice");
  const [copyMessage, setCopyMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const trimmedLatex = latexContent.trim();
  const activeTemplate =
    promptTemplates.find((template) => template.type === selectedPromptType) ??
    promptTemplates[0];
  const canSave = useMemo(
    () => trimmedLatex.length > 0 && selectedQuestionTypeId.length > 0,
    [selectedQuestionTypeId, trimmedLatex]
  );

  function handleRecommend() {
    setErrorMessage("");
    setSelectedQuestionTypeId("");

    startTransition(async () => {
      try {
        const results = await recommendQuestionTypes({
          inputType: "latex",
          rawText: "",
          latexContent
        });

        setRecommendations(results);

        if (results.length === 0) {
          setErrorMessage("题型库为空或暂时没有可推荐题型，请先维护题型库。");
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "推荐题型时发生未知错误"
        );
      }
    });
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(activeTemplate.prompt);
      setCopyMessage("提示词已复制，可以粘贴到豆包 / DeepSeek / ChatGPT。");
    } catch {
      setCopyMessage("复制失败，请手动选中提示词复制。");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <form
        action={saveMistake}
        className="rounded-md border border-ink/10 bg-white p-4 shadow-sm sm:p-5"
      >
        <input type="hidden" name="questionTypeId" value={selectedQuestionTypeId} />
        <input type="hidden" name="inputType" value="latex" />
        <input type="hidden" name="rawText" value="" />

        <div>
          <p className="text-sm font-medium text-clay">AI 录题助手模式</p>
          <h2 className="mt-1 text-lg font-semibold text-ink">录入错题 LaTeX</h2>
          <p className="mt-2 text-sm leading-6 text-ink/65">
            系统内暂不做 OCR。请先用外部 AI 工具把题目图片转成规定格式的
            LaTeX，再粘贴到这里检查预览。
          </p>
        </div>

        {message ? (
          <p className="mt-5 rounded-md border border-clay/30 bg-clay/10 px-3 py-2 text-sm text-clay">
            {message}
          </p>
        ) : null}

        <section className="mt-5 rounded-md border border-moss/15 bg-moss/5 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-ink">推荐流程</h3>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-ink/65">
                <li>拍清楚题目图片</li>
                <li>打开豆包 / DeepSeek / ChatGPT</li>
                <li>复制本系统提供的提示词</li>
                <li>让 AI 转成 LaTeX 代码</li>
                <li>粘贴回本页面</li>
                <li>检查预览无误后保存</li>
              </ol>
            </div>
            <button
              type="button"
              onClick={() => setAssistantOpen(true)}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-moss px-4 text-sm font-medium text-white sm:w-auto"
            >
              <Bot className="h-4 w-4" />
              AI 录题助手
            </button>
          </div>
        </section>

        <div className="mt-5 grid gap-4">
          <label className="block text-sm font-medium text-ink">
            题目 LaTeX 代码
            <textarea
              name="latexContent"
              required
              rows={12}
              value={latexContent}
              onChange={(event) => setLatexContent(event.target.value)}
              placeholder={latexPlaceholder}
              className="mt-2 w-full rounded-md border border-ink/15 px-3 py-2 font-mono text-sm leading-6 outline-none focus:border-moss"
            />
          </label>
          <div className="max-w-full overflow-x-auto rounded-md border border-ink/10 bg-paper p-4">
            <p className="mb-3 text-sm font-medium text-ink">实时预览</p>
            <LatexProblemRenderer
              rawLatex={latexContent}
              fallback="输入 LaTeX 后显示预览"
            />
          </div>
        </div>

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

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={handleRecommend}
            disabled={isPending || trimmedLatex.length === 0}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-moss px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-55 sm:h-10"
          >
            <Sparkles className="h-4 w-4" />
            {isPending ? "推荐中" : "智能推荐题型"}
          </button>
          <button
            type="submit"
            name="intent"
            value="save"
            disabled={!canSave}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-ink/15 bg-white px-4 text-sm font-medium text-ink disabled:cursor-not-allowed disabled:opacity-55 sm:h-10"
          >
            <Save className="h-4 w-4" />
            保存错题
          </button>
          <button
            type="submit"
            name="intent"
            value="submit_review"
            disabled={trimmedLatex.length === 0}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-clay/25 bg-clay/10 px-4 text-sm font-medium text-clay disabled:cursor-not-allowed disabled:opacity-55 sm:h-10"
          >
            <Send className="h-4 w-4" />
            提交教师审核
          </button>
        </div>
      </form>

      <aside className="rounded-md border border-ink/10 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-semibold text-ink">推荐题型</h2>
        <p className="mt-2 text-sm leading-6 text-ink/65">
          推荐结果来自数据库题型库，使用识别特征和代表例题相似度进行匹配。
        </p>

        {errorMessage ? (
          <p className="mt-5 rounded-md border border-clay/30 bg-clay/10 px-3 py-2 text-sm text-clay">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-5 space-y-3">
          {recommendations.length === 0 && !errorMessage ? (
            <div className="rounded-md border border-dashed border-ink/20 bg-paper px-4 py-8 text-center text-sm text-ink/60">
              粘贴 LaTeX 后点击智能推荐，系统会显示最可能的 3 个题型。
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

      {assistantOpen ? (
        <AiPromptAssistantModal
          activeTemplate={activeTemplate}
          selectedPromptType={selectedPromptType}
          copyMessage={copyMessage}
          onSelect={(type) => {
            setSelectedPromptType(type);
            setCopyMessage("");
          }}
          onCopy={copyPrompt}
          onClose={() => {
            setAssistantOpen(false);
            setCopyMessage("");
          }}
        />
      ) : null}
    </div>
  );
}

function AiPromptAssistantModal({
  activeTemplate,
  selectedPromptType,
  copyMessage,
  onSelect,
  onCopy,
  onClose
}: {
  activeTemplate: PromptTemplate;
  selectedPromptType: PromptType;
  copyMessage: string;
  onSelect: (type: PromptType) => void;
  onCopy: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink/35 px-3 py-4 sm:items-center sm:justify-center">
      <div className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-md bg-white p-4 shadow-xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-clay">AI 录题助手</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">
              复制提示词到外部 AI 工具
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink/65">
              本系统不上传图片、不调用 AI API。这里只提供统一格式提示词，帮助你把题目转成可预览、可分类的 LaTeX。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-ink/15 bg-white text-ink"
            aria-label="关闭 AI 录题助手"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {promptTemplates.map((template) => (
            <button
              key={template.type}
              type="button"
              onClick={() => onSelect(template.type)}
              className={`h-11 rounded-md border px-3 text-sm font-medium ${
                selectedPromptType === template.type
                  ? "border-moss bg-moss/10 text-moss"
                  : "border-ink/10 bg-paper text-ink/65"
              }`}
            >
              {template.label}
            </button>
          ))}
        </div>

        <section className="mt-5 rounded-md border border-ink/10 bg-paper p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-ink">
                {activeTemplate.title}
              </h3>
              <p className="mt-1 text-sm leading-6 text-ink/60">
                {activeTemplate.description}
              </p>
            </div>
            <button
              type="button"
              onClick={onCopy}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-moss px-4 text-sm font-medium text-white sm:w-auto"
            >
              <ClipboardCopy className="h-4 w-4" />
              一键复制
            </button>
          </div>

          {copyMessage ? (
            <p className="mt-3 rounded-md border border-moss/20 bg-white px-3 py-2 text-sm text-moss">
              {copyMessage}
            </p>
          ) : null}

          <textarea
            readOnly
            value={activeTemplate.prompt}
            rows={18}
            className="mt-4 w-full rounded-md border border-ink/10 bg-white px-3 py-2 font-mono text-xs leading-6 text-ink/75 outline-none"
          />
        </section>
      </div>
    </div>
  );
}
