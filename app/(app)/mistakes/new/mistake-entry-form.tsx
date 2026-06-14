"use client";

import { type MouseEvent, useMemo, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  Bot,
  CheckCircle2,
  ClipboardCopy,
  Loader2,
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
type PromptChannel = "web" | "app";
type SubmitIntent = "save" | "submit_review" | null;

type PromptTemplate = {
  type: PromptType;
  label: string;
  title: string;
  description: string;
  webPrompt: string;
  appPrompt: string;
};

const latexPlaceholder = String.raw`若函数$f(x)$在$x=1$处连续,且$\lim\limits_{x \to 1}\frac{f(x)}{x-1}=2,$则$\lim\limits_{x \to 0}\frac{f(1-2x)}{x}=$\blankbox
\fourchoices
{$-4$}{$-1$}{$1$}{$4$}`;

const commonPromptRules = [
  "所有数学表达式必须使用 `$...$` 包裹。",
  "只使用行内公式 `$...$`。",
  "不要使用 `\\(...\\)`、`\\[...\\]`、`$$...$$`。",
  "不要把整句中文放进 `$...$`，只包裹数学表达式。",
  "如果题干中出现变量、公式、数学符号、运算表达式，但没有被 `$...$` 包裹，必须先修正后再输出。",
  "不要输出答案。",
  "不要输出解析。",
  "不要使用 JSON。"
];

const webPromptRules = [
  "只输出题目代码，不输出解释。",
  "不使用 Markdown 代码块。",
  "直接输出可粘贴到系统中的 LaTeX 代码。"
];

const appPromptRules = [
  "请把最终结果放在一个纯文本代码块中输出，代码块语言使用 text。",
  "代码块内必须保留所有 `$`、`\\frac`、`\\lim`、`\\fourchoices` 等 LaTeX 符号，不要让公式被渲染成数学显示效果。",
  "除代码块内题目代码外，不输出任何解释、答案、解析或多余文字。"
];

const singleChoiceRules = [
  "选择题空格、括号、填空位置统一使用 `\\blankbox`。",
  "四个选项必须使用：",
  String.raw`\fourchoices`,
  "{选项A}{选项B}{选项C}{选项D}",
  "选项内容如果是数学表达式，必须使用 `$...$` 包裹。",
  "不要输出 A、B、C、D 字母标签。"
];

const fillBlankRules = [
  String.raw`填空位置统一使用 \_\_\_。`,
  "所有数学表达式必须使用 `$...$` 包裹。"
];

const calculationRules = [
  "如果题目是求极限、求导、积分、证明题，请完整保留题目条件。",
  "所有数学表达式必须使用 `$...$` 包裹。"
];

const singleChoiceExample = [
  String.raw`若函数$f(x)$在$x=1$处连续，且$\lim\limits_{x \to 1}\frac{f(x)}{x-1}=2$，则$\lim\limits_{x \to 0}\frac{f(1-2x)}{x}=$\blankbox`,
  String.raw`\fourchoices`,
  String.raw`{$-4$}{$-1$}{$1$}{$4$}`
];

const fillBlankExample = [
  String.raw`已知曲线$f(x)=\dfrac{e^x-1}{x-a}$有垂直渐近线$x=3$，则$a=$\_\_\_`
];

const calculationExample = [
  "求极限：",
  String.raw`$\lim\limits_{x \to 0}\dfrac{e^{x-\sin x}-1}{\arcsin x^3}$`
];

function buildPrompt({
  channel,
  typeRules,
  example
}: {
  channel: PromptChannel;
  typeRules: string[];
  example: string[];
}) {
  const outputRules = channel === "web" ? webPromptRules : appPromptRules;
  const exampleLines =
    channel === "web" ? example : ["```text", ...example, "```"];

  return [
    "请将我提供的数学题图片或文字转换为可直接粘贴到系统中的 LaTeX 代码。",
    "",
    "通用规则：",
    ...commonPromptRules.map((rule, index) => `${index + 1}. ${rule}`),
    "",
    "输出规则：",
    ...outputRules.map((rule, index) => `${index + 1}. ${rule}`),
    "",
    "题型规则：",
    ...typeRules.map((rule, index) => `${index + 1}. ${rule}`),
    "",
    channel === "web"
      ? "输出格式示例："
      : "输出格式示例（手机 App 版必须使用 text 代码块）：",
    ...exampleLines
  ].join("\n");
}

const promptTemplates: PromptTemplate[] = [
  {
    type: "single_choice",
    label: "单选题",
    title: "单选题 LaTeX 转写提示词",
    description: "适合包含 A/B/C/D 四个选项的选择题，输出可直接粘贴进本系统。",
    webPrompt: buildPrompt({
      channel: "web",
      typeRules: singleChoiceRules,
      example: singleChoiceExample
    }),
    appPrompt: buildPrompt({
      channel: "app",
      typeRules: singleChoiceRules,
      example: singleChoiceExample
    })
  },
  {
    type: "fill_blank",
    label: "填空题",
    title: "填空题 LaTeX 转写提示词",
    description: "适合没有选项、需要填写一个或多个空的题目。",
    webPrompt: buildPrompt({
      channel: "web",
      typeRules: fillBlankRules,
      example: fillBlankExample
    }),
    appPrompt: buildPrompt({
      channel: "app",
      typeRules: fillBlankRules,
      example: fillBlankExample
    })
  },
  {
    type: "calculation",
    label: "计算题",
    title: "计算题 LaTeX 转写提示词",
    description: "适合极限、导数、积分、证明等需要完整保留条件的题目。",
    webPrompt: buildPrompt({
      channel: "web",
      typeRules: calculationRules,
      example: calculationExample
    }),
    appPrompt: buildPrompt({
      channel: "app",
      typeRules: calculationRules,
      example: calculationExample
    })
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
  const [formHint, setFormHint] = useState("");
  const [submitIntent, setSubmitIntent] = useState<SubmitIntent>(null);
  const [isPending, startTransition] = useTransition();

  const trimmedLatex = latexContent.trim();
  const activeTemplate =
    promptTemplates.find((template) => template.type === selectedPromptType) ??
    promptTemplates[0];
  const canSave = useMemo(
    () => trimmedLatex.length > 0 && selectedQuestionTypeId.length > 0,
    [selectedQuestionTypeId, trimmedLatex]
  );
  const hasLatex = trimmedLatex.length > 0;

  function handleRecommend() {
    setErrorMessage("");
    setFormHint("");
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

  async function copyPrompt(channel: PromptChannel) {
    const prompt =
      channel === "web" ? activeTemplate.webPrompt : activeTemplate.appPrompt;
    const channelLabel = channel === "web" ? "网页端" : "手机 App";

    try {
      await navigator.clipboard.writeText(prompt);
      setCopyMessage(
        `${channelLabel}提示词已复制，可以粘贴到豆包 / DeepSeek / ChatGPT。`
      );
    } catch {
      setCopyMessage("复制失败，请手动选中提示词复制。");
    }
  }

  return (
    <>
      <form
        action={saveMistake}
        className="grid gap-5 min-[980px]:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]"
      >
        <input type="hidden" name="questionTypeId" value={selectedQuestionTypeId} />
        <input type="hidden" name="inputType" value="latex" />
        <input type="hidden" name="rawText" value="" />

        <section className="rounded-2xl border border-ink/10 bg-white/95 p-4 shadow-sm sm:p-5">
          <div>
            <p className="text-sm font-medium text-clay">左侧主栏</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">
              粘贴 LaTeX 并检查预览
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink/65">
              先把外部 AI 转写出的 LaTeX 放进来，确认题干和选项显示正常，再补充备注。
            </p>
          </div>

          {message ? (
            <p className="mt-5 rounded-xl border border-clay/30 bg-clay/10 px-4 py-3 text-sm text-clay">
              {message}
            </p>
          ) : null}

          <div className="mt-5 grid gap-3 rounded-2xl border border-moss/15 bg-moss/5 p-3 text-sm text-ink/70 sm:grid-cols-4">
            {["粘贴 LaTeX", "查看预览", "选择题型", "保存或审核"].map(
              (step, index) => (
                <div key={step} className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-moss shadow-sm">
                    {index + 1}
                  </span>
                  <span className="font-medium">{step}</span>
                </div>
              )
            )}
          </div>

          <div className="mt-5 grid gap-4">
            <label className="block text-sm font-medium text-ink">
              题目 LaTeX 代码
              <span className="mt-1 block text-xs font-normal leading-5 text-ink/50">
                支持系统现有的 \blankbox、\fourchoices 等格式；长公式会在预览区横向滚动。
              </span>
              <textarea
                name="latexContent"
                required
                rows={13}
                value={latexContent}
                onChange={(event) => {
                  setLatexContent(event.target.value);
                  setFormHint("");
                }}
                placeholder={latexPlaceholder}
                className="mt-2 min-h-[260px] w-full resize-y rounded-xl border border-ink/15 bg-white px-3 py-3 font-mono text-sm leading-6 outline-none transition focus:border-moss focus:ring-2 focus:ring-moss/10"
              />
            </label>

            <div className="max-w-full overflow-x-auto rounded-2xl border border-ink/10 bg-paper p-4">
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-ink">LaTeX 实时预览</p>
                <p className="text-xs text-ink/45">长公式可横向滚动</p>
              </div>
              <LatexProblemRenderer
                rawLatex={latexContent}
                fallback="输入 LaTeX 后显示预览"
              />
              <p className="mt-3 text-xs leading-5 text-ink/45">
                如果公式语法暂时不完整，预览区会保留原文提示，不会影响你继续编辑。
              </p>
            </div>

            <label className="block text-sm font-medium text-ink">
              备注
              <span className="mt-1 block text-xs font-normal leading-5 text-ink/50">
                可记录错误原因、解题卡点或下次复盘提醒。
              </span>
              <textarea
                name="note"
                rows={4}
                placeholder="例如：等价无穷小替换漏掉了使用条件。"
                className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-3 py-3 text-sm leading-6 outline-none transition focus:border-moss focus:ring-2 focus:ring-moss/10"
              />
            </label>
          </div>
        </section>

        <aside className="self-start rounded-2xl border border-ink/10 bg-white/95 p-4 shadow-sm sm:p-5 min-[980px]:sticky min-[980px]:top-5">
          <section className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-sky-700">
                  AI 录题助手
                </p>
                <h2 className="mt-1 text-lg font-semibold text-ink">
                  先把图片转成 LaTeX
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setAssistantOpen(true)}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-moss px-3 text-sm font-medium text-white"
              >
                <Bot className="h-4 w-4" />
                打开
              </button>
            </div>
            <ol className="mt-3 space-y-1 text-sm leading-6 text-ink/65">
              <li>1. 复制提示词到外部 AI 工具。</li>
              <li>2. 粘贴返回的 LaTeX 到左侧输入框。</li>
              <li>3. 检查预览后再选择保存或审核。</li>
            </ol>
          </section>

          <section className="mt-4 rounded-2xl border border-ink/10 bg-paper/70 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between min-[980px]:flex-col">
              <div>
                <h2 className="text-lg font-semibold text-ink">智能推荐题型</h2>
                <p className="mt-1 text-sm leading-6 text-ink/60">
                  推荐 top 3 来自题型库相似度匹配，也可以在下方手动选择。
                </p>
              </div>
              <button
                type="button"
                onClick={handleRecommend}
                disabled={isPending || !hasLatex}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-moss px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto min-[980px]:w-full"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {isPending ? "推荐中" : "智能推荐题型"}
              </button>
            </div>

            {errorMessage ? (
              <p className="mt-4 rounded-xl border border-clay/30 bg-clay/10 px-3 py-2 text-sm text-clay">
                {errorMessage}
              </p>
            ) : null}

            <div className="mt-4 space-y-3">
              {recommendations.length === 0 && !errorMessage ? (
                <div className="rounded-xl border border-dashed border-ink/20 bg-white px-4 py-6 text-center text-sm leading-6 text-ink/60">
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
                    onClick={() => {
                      setSelectedQuestionTypeId(recommendation.questionTypeId);
                      setFormHint("");
                    }}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      selected
                        ? "border-moss bg-moss/10 shadow-sm"
                        : "border-ink/10 bg-white hover:border-moss/40"
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
                          className="rounded-md bg-paper px-2 py-1 text-xs text-ink/70"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <label className="mt-4 block text-sm font-medium text-ink">
            手动选择题型
            <select
              name="manualQuestionTypeId"
              value={selectedQuestionTypeId}
              onChange={(event) => {
                setSelectedQuestionTypeId(event.target.value);
                setFormHint("");
              }}
              className="mt-2 h-11 w-full rounded-xl border border-ink/15 bg-white px-3 text-sm outline-none transition focus:border-moss focus:ring-2 focus:ring-moss/10"
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

          <section className="mt-4 rounded-2xl border border-moss/15 bg-moss/5 p-4">
            <h2 className="text-base font-semibold text-ink">提交方式</h2>
            <div className="mt-2 space-y-1 text-sm leading-6 text-ink/65">
              <p>已经确定题型？保存后会进入复习计划。</p>
              <p>不确定题型？可以先提交给老师审核。</p>
            </div>

            {formHint ? (
              <p
                id="mistake-save-hint"
                role="alert"
                className="mt-3 rounded-xl border border-clay/30 bg-white px-3 py-2 text-sm text-clay"
              >
                {formHint}
              </p>
            ) : null}

            <MistakeSubmitActions
              canSave={canSave}
              hasLatex={hasLatex}
              hasSelectedQuestionType={selectedQuestionTypeId.length > 0}
              submitIntent={submitIntent}
              onHint={setFormHint}
              onIntent={setSubmitIntent}
            />
          </section>
        </aside>
      </form>

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
    </>
  );
}

function MistakeSubmitActions({
  canSave,
  hasLatex,
  hasSelectedQuestionType,
  submitIntent,
  onHint,
  onIntent
}: {
  canSave: boolean;
  hasLatex: boolean;
  hasSelectedQuestionType: boolean;
  submitIntent: SubmitIntent;
  onHint: (message: string) => void;
  onIntent: (intent: SubmitIntent) => void;
}) {
  const { pending } = useFormStatus();

  function handleSaveClick(event: MouseEvent<HTMLButtonElement>) {
    onIntent("save");

    if (!hasSelectedQuestionType) {
      event.preventDefault();
      onHint("请先选择题型，或者改用“提交教师审核”。");
      return;
    }

    onHint("");
  }

  function handleReviewClick() {
    onIntent("submit_review");
    onHint("");
  }

  const saving = pending && submitIntent === "save";
  const submittingReview = pending && submitIntent === "submit_review";

  return (
    <div className="mt-4 grid gap-3">
      <button
        type="submit"
        name="intent"
        value="save"
        onClick={handleSaveClick}
        aria-busy={saving}
        aria-describedby={!canSave && hasLatex ? "mistake-save-hint" : undefined}
        disabled={pending || !hasLatex}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-moss px-4 text-sm font-medium text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-55"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {saving ? "保存中" : "保存错题"}
      </button>

      <button
        type="submit"
        name="intent"
        value="submit_review"
        onClick={handleReviewClick}
        aria-busy={submittingReview}
        disabled={pending || !hasLatex}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-clay/25 bg-white px-4 text-sm font-medium text-clay transition hover:bg-clay/10 disabled:cursor-not-allowed disabled:opacity-55"
      >
        {submittingReview ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {submittingReview ? "提交中" : "提交教师审核"}
      </button>
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
  onCopy: (channel: PromptChannel) => void;
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
          <div>
            <h3 className="text-base font-semibold text-ink">
              {activeTemplate.title}
            </h3>
            <p className="mt-1 text-sm leading-6 text-ink/60">
              {activeTemplate.description}
            </p>
          </div>

          {copyMessage ? (
            <p className="mt-3 rounded-md border border-moss/20 bg-white px-3 py-2 text-sm text-moss">
              {copyMessage}
            </p>
          ) : null}

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <PromptCopyPanel
              title="网页端提示词"
              description="适合在电脑或网页端使用。AI 会直接输出可粘贴到系统中的 LaTeX 题目代码，不使用 Markdown 代码块。"
              buttonLabel="复制网页端提示词"
              prompt={activeTemplate.webPrompt}
              onCopy={() => onCopy("web")}
            />
            <PromptCopyPanel
              title="手机 App 提示词"
              description="手机 App 中建议使用此版本。生成结果会放在 text 代码块中，更容易保留 `$`、`\\frac`、`\\lim`、`\\fourchoices` 等 LaTeX 符号。复制时请优先点击“复制代码”，或只复制代码块内部内容。"
              buttonLabel="复制手机 App 提示词"
              prompt={activeTemplate.appPrompt}
              onCopy={() => onCopy("app")}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function PromptCopyPanel({
  title,
  description,
  buttonLabel,
  prompt,
  onCopy
}: {
  title: string;
  description: string;
  buttonLabel: string;
  prompt: string;
  onCopy: () => void;
}) {
  return (
    <section className="rounded-md border border-ink/10 bg-white p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between lg:flex-col">
        <div>
          <h4 className="text-sm font-semibold text-ink">{title}</h4>
          <p className="mt-1 text-xs leading-5 text-ink/55">{description}</p>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-moss px-3 text-sm font-medium text-white sm:w-auto lg:w-full"
        >
          <ClipboardCopy className="h-4 w-4" />
          {buttonLabel}
        </button>
      </div>

      <textarea
        readOnly
        value={prompt}
        rows={18}
        className="mt-3 w-full rounded-md border border-ink/10 bg-paper px-3 py-2 font-mono text-xs leading-6 text-ink/75 outline-none"
      />
    </section>
  );
}
