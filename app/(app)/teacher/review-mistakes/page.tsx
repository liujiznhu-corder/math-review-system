import { CheckCircle2 } from "lucide-react";
import { LatexProblemRenderer } from "@/components/problems/LatexProblemRenderer";
import { createClient } from "@/lib/supabase/server";
import {
  canManageQuestionTypes,
  getCurrentUserRole,
  redirectStudentToDashboard
} from "@/lib/roles";
import {
  classifyQuestion,
  type ClassifierQuestionType
} from "@/services/classifier";
import { getClassificationText } from "@/services/latex";
import { normalizeLatexProblem } from "@/services/latex-normalizer";
import { confirmMistakeQuestionType } from "./actions";
import type { Database } from "@/types/database";

type QuestionTypeRow = Pick<
  Database["public"]["Tables"]["question_types"]["Row"],
  "id" | "level1" | "level2" | "level3" | "keywords"
> & {
  question_type_examples: {
    id: string;
    example_text: string;
  }[];
};

type PendingMistake = Pick<
  Database["public"]["Tables"]["mistakes"]["Row"],
  | "id"
  | "stem"
  | "raw_text"
  | "raw_latex"
  | "latex_content"
  | "input_type"
  | "problem_type"
  | "note"
  | "created_at"
  | "teacher_note"
>;

type ReviewMistakesPageProps = {
  searchParams?: Promise<{
    message?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ReviewMistakesPage({
  searchParams
}: ReviewMistakesPageProps) {
  const params = await searchParams;
  await redirectStudentToDashboard();
  const role = await getCurrentUserRole();

  if (!canManageQuestionTypes(role)) {
    await redirectStudentToDashboard();
  }

  const supabase = await createClient();
  const [{ data: questionTypes }, { data: mistakes, error }] =
    await Promise.all([
      supabase
        .from("question_types")
        .select(
          "id, level1, level2, level3, keywords, question_type_examples(id, example_text)"
        )
        .eq("is_active", true)
        .order("level1", { ascending: true })
        .order("level2", { ascending: true })
        .order("level3", { ascending: true }),
      supabase
        .from("mistakes")
        .select(
          "id, stem, raw_text, raw_latex, latex_content, input_type, problem_type, note, created_at, teacher_note"
        )
        .eq("classification_status", "pending")
        .order("created_at", { ascending: true })
    ]);

  const availableQuestionTypes = (questionTypes ?? []) as QuestionTypeRow[];
  const classifierQuestionTypes = availableQuestionTypes.map(
    (questionType): ClassifierQuestionType => ({
      id: questionType.id,
      level1: questionType.level1,
      level2: questionType.level2,
      level3: questionType.level3,
      keywords: questionType.keywords ?? [],
      examples: questionType.question_type_examples.map((example) => ({
        id: example.id,
        questionTypeId: questionType.id,
        exampleText: example.example_text
      }))
    })
  );
  const questionTypeMap = new Map(
    availableQuestionTypes.map((questionType) => [questionType.id, questionType])
  );
  const pendingMistakes = (mistakes ?? []) as PendingMistake[];

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8">
      <div>
        <p className="text-sm font-medium text-clay">教师端</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">错题审核</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">
          审核页只负责确认学生错题的最终题型。需要沉淀到教师题库时，请到答案解析中心手动加入。
        </p>
      </div>

      {params?.message ? (
        <p className="mt-6 rounded-md border border-moss/20 bg-white px-4 py-3 text-sm text-moss">
          {params.message}
        </p>
      ) : null}

      {error ? (
        <p className="mt-6 rounded-md border border-clay/30 bg-clay/10 px-4 py-3 text-sm text-clay">
          {error.message}
        </p>
      ) : null}

      <section className="mt-8">
        {pendingMistakes.length === 0 ? (
          <div className="rounded-md border border-dashed border-ink/20 bg-white px-5 py-10 text-center text-sm text-ink/60">
            暂无待审核错题。
          </div>
        ) : (
          <div className="space-y-5">
            {pendingMistakes.map((mistake) => {
              const recommendations = getRecommendations(
                mistake,
                classifierQuestionTypes,
                questionTypeMap
              );

              return (
                <article
                  key={mistake.id}
                  className="rounded-md border border-ink/10 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm text-ink/55">
                        提交时间：{formatDate(mistake.created_at)}
                      </p>
                      <h2 className="mt-1 text-base font-semibold text-ink">
                        待确认题型
                      </h2>
                    </div>
                  </div>

                  <div className="mt-4 rounded-md bg-paper p-4">
                    {mistake.input_type === "latex" ? (
                      <LatexProblemRenderer
                        rawLatex={mistake.raw_latex ?? mistake.latex_content}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap text-sm leading-6 text-ink/75">
                        {mistake.raw_text || mistake.stem}
                      </p>
                    )}
                  </div>

                  {mistake.note ? (
                    <p className="mt-3 rounded-md border border-ink/10 px-3 py-2 text-sm leading-6 text-ink/65">
                      学生备注：{mistake.note}
                    </p>
                  ) : null}

                  <div className="mt-4">
                    <p className="text-sm font-medium text-ink">
                      系统推荐 top 3
                    </p>
                    <div className="mt-2 grid gap-2 lg:grid-cols-3">
                      {recommendations.map((recommendation) => (
                        <div
                          key={recommendation.id}
                          className="rounded-md border border-ink/10 bg-paper p-3"
                        >
                          <p className="text-sm font-semibold text-ink">
                            {recommendation.level3}
                          </p>
                          <p className="mt-1 text-xs text-ink/55">
                            {recommendation.level1} / {recommendation.level2}
                          </p>
                          <p className="mt-2 text-xs text-ink/70">
                            分数：{recommendation.score}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {(recommendation.reasons.length > 0
                              ? recommendation.reasons
                              : ["暂无明显匹配理由"]
                            ).map((reason) => (
                              <span
                                key={reason}
                                className="rounded bg-white px-2 py-1 text-xs text-ink/60"
                              >
                                {reason}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <form
                    action={confirmMistakeQuestionType}
                    className="mt-5 grid gap-4"
                  >
                    <input type="hidden" name="mistakeId" value={mistake.id} />
                    <label className="block text-sm font-medium text-ink">
                      教师确认题型
                      <select
                        name="questionTypeId"
                        required
                        className="mt-2 h-10 w-full rounded-md border border-ink/15 bg-white px-3 text-sm outline-none focus:border-moss"
                      >
                        <option value="">选择已有题型</option>
                        {availableQuestionTypes.map((questionType) => (
                          <option key={questionType.id} value={questionType.id}>
                            {questionType.level1} / {questionType.level2} /{" "}
                            {questionType.level3}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-sm font-medium text-ink">
                      题目类型
                      <select
                        name="problemType"
                        defaultValue={mistake.problem_type}
                        className="mt-2 h-10 w-full rounded-md border border-ink/15 bg-white px-3 text-sm outline-none focus:border-moss"
                      >
                        <option value="single_choice">单选题</option>
                        <option value="fill_blank">填空题</option>
                        <option value="calculation">计算题</option>
                      </select>
                    </label>

                    <label className="block text-sm font-medium text-ink">
                      规范化 raw_latex
                      <textarea
                        name="rawLatex"
                        rows={5}
                        defaultValue={
                          mistake.raw_latex ?? mistake.latex_content ?? ""
                        }
                        placeholder="可选：将学生题目整理为教师原生 LaTeX，保存后学生答案页和答案解析中心会优先使用该内容。"
                        className="mt-2 w-full rounded-md border border-ink/15 px-3 py-2 font-mono text-sm leading-6 outline-none focus:border-moss"
                      />
                    </label>

                    <label className="block text-sm font-medium text-ink">
                      教师备注
                      <textarea
                        name="teacherNote"
                        rows={3}
                        placeholder="可选：写给学生的分类说明或复习提醒。"
                        className="mt-2 w-full rounded-md border border-ink/15 px-3 py-2 text-sm leading-6 outline-none focus:border-moss"
                      />
                    </label>

                    <details className="rounded-md border border-ink/10 bg-paper p-4">
                      <summary className="cursor-pointer text-sm font-medium text-ink">
                        可选：补充答案解析
                      </summary>
                      <p className="mt-2 text-xs leading-5 text-ink/55">
                        答案解析中心是统一维护入口。这里填写时仅保存到学生错题，之后仍可在答案解析中心继续编辑。
                      </p>
                      <div className="mt-4 grid gap-4">
                        <label className="block text-sm font-medium text-ink">
                          答案（可选，支持 LaTeX）
                          <textarea
                            name="answer"
                            rows={3}
                            placeholder="可选：例如 $\\frac{1}{2}$"
                            className="mt-2 w-full rounded-md border border-ink/15 px-3 py-2 font-mono text-sm leading-6 outline-none focus:border-moss"
                          />
                        </label>
                        <label className="block text-sm font-medium text-ink">
                          解析（可选，支持 LaTeX）
                          <textarea
                            name="analysis"
                            rows={5}
                            placeholder="可选：填写解题步骤、关键公式或易错点。"
                            className="mt-2 w-full rounded-md border border-ink/15 px-3 py-2 font-mono text-sm leading-6 outline-none focus:border-moss"
                          />
                        </label>
                      </div>
                    </details>

                    <div>
                      <button
                        type="submit"
                        className="inline-flex h-10 items-center gap-2 rounded-md bg-moss px-4 text-sm font-medium text-white"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        确认题型
                      </button>
                    </div>
                  </form>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function getRecommendations(
  mistake: PendingMistake,
  questionTypes: ClassifierQuestionType[],
  questionTypeMap: Map<string, QuestionTypeRow>
) {
  const classificationText =
    mistake.raw_latex && mistake.input_type === "latex"
      ? normalizeLatexProblem(mistake.raw_latex).plainText
      : getClassificationText({
          inputType: mistake.input_type,
          rawText: mistake.raw_text || mistake.stem,
          latexContent: mistake.latex_content ?? ""
        });

  return classifyQuestion({
    stem: classificationText,
    questionTypes,
    limit: 3
  }).flatMap((result) => {
    const questionType = questionTypeMap.get(result.questionTypeId);

    if (!questionType) {
      return [];
    }

    return {
      id: questionType.id,
      level1: questionType.level1,
      level2: questionType.level2,
      level3: questionType.level3,
      score: Number(result.score.toFixed(2)),
      reasons: result.reasons
    };
  });
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
}
