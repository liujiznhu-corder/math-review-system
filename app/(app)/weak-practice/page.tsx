import Link from "next/link";
import { CheckCircle2, Eye, Target, XCircle } from "lucide-react";
import { LatexContentRenderer } from "@/components/problems/LatexContentRenderer";
import { LatexProblemRenderer } from "@/components/problems/LatexProblemRenderer";
import { redirectTeacherToDashboard } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { getTodayWeakPracticeData } from "@/services/student/weak-practice";
import { completeWeakPracticeTask } from "./actions";

type WeakPracticePageProps = {
  searchParams?: Promise<{
    message?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function WeakPracticePage({
  searchParams
}: WeakPracticePageProps) {
  await redirectTeacherToDashboard();

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const params = await searchParams;
  const data = await getTodayWeakPracticeData(user.id);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-clay">薄弱巩固</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">
            今日薄弱巩固 5 题
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">
            系统会根据你的错题、未掌握记录和最近 7 天错题，从教师题库中推荐今天要练的题。
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border border-ink/10 bg-white px-4 py-3">
            <p className="text-xs text-ink/55">今日任务</p>
            <p className="mt-1 text-xl font-semibold text-ink">
              {data.totalCount}
            </p>
          </div>
          <div className="rounded-md border border-ink/10 bg-white px-4 py-3">
            <p className="text-xs text-ink/55">已完成</p>
            <p className="mt-1 text-xl font-semibold text-ink">
              {data.completedCount}
            </p>
          </div>
        </div>
      </div>

      {params?.message ? (
        <p className="mt-6 rounded-md border border-moss/20 bg-white px-4 py-3 text-sm text-moss">
          {params.message}
        </p>
      ) : null}

      <section className="mt-8">
        {data.tasks.length === 0 ? (
          <div className="rounded-md border border-dashed border-ink/20 bg-white px-5 py-10 text-center text-sm text-ink/60">
            教师题库中暂时没有可推荐的题目。请先让老师录入带题型的题目。
          </div>
        ) : (
          <div className="space-y-4">
            {data.tasks.map((task, index) => (
              <article
                key={task.id}
                className="rounded-md border border-ink/10 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm text-ink/55">
                      第 {index + 1} 题 · {getSourceTypeLabel(task.sourceType)}
                    </p>
                    <h2 className="mt-1 text-base font-semibold text-ink">
                      {task.problem?.questionType
                        ? `${task.problem.questionType.level1} / ${task.problem.questionType.level2} / ${task.problem.questionType.level3}`
                        : "未指定题型"}
                    </h2>
                  </div>
                  <span className={getStatusClassName(task.status)}>
                    {task.status === "completed" ? "已完成" : "待完成"}
                  </span>
                </div>

                <div className="mt-4 rounded-md bg-paper p-4">
                  {task.problem ? (
                    <LatexProblemRenderer rawLatex={task.problem.rawLatex} />
                  ) : (
                    <p className="text-sm text-ink/55">题目已不存在。</p>
                  )}
                </div>

                {task.problem ? (
                  <details className="mt-4 rounded-md border border-ink/10 bg-white p-4">
                    <summary className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-moss">
                      <Eye className="h-4 w-4" />
                      查看答案
                    </summary>
                    {task.problem.answer?.trim() ||
                    task.problem.analysis?.trim() ? (
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <section className="rounded-md bg-paper p-4">
                          <h3 className="text-sm font-semibold text-ink">
                            答案
                          </h3>
                          <div className="mt-3">
                            <LatexContentRenderer
                              content={task.problem.answer}
                              fallback="暂无答案"
                            />
                          </div>
                        </section>
                        <section className="rounded-md bg-paper p-4">
                          <h3 className="text-sm font-semibold text-ink">
                            解析
                          </h3>
                          <div className="mt-3">
                            <LatexContentRenderer
                              content={task.problem.analysis}
                              fallback="暂无解析"
                            />
                          </div>
                        </section>
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-ink/60">
                        答案解析暂未补充，请等待老师更新。
                      </p>
                    )}
                  </details>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-3">
                  <form action={completeWeakPracticeTask}>
                    <input type="hidden" name="taskId" value={task.id} />
                    <button
                      type="submit"
                      name="result"
                      value="mastered"
                      disabled={task.status === "completed"}
                      className="inline-flex h-10 items-center gap-2 rounded-md bg-moss px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      已完成
                    </button>
                  </form>
                  <form action={completeWeakPracticeTask}>
                    <input type="hidden" name="taskId" value={task.id} />
                    <button
                      type="submit"
                      name="result"
                      value="not_mastered"
                      disabled={task.status === "completed"}
                      className="inline-flex h-10 items-center gap-2 rounded-md border border-clay/25 bg-clay/10 px-4 text-sm font-medium text-clay disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <XCircle className="h-4 w-4" />
                      仍需巩固
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="mt-8">
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center gap-2 rounded-md border border-ink/15 bg-white px-4 text-sm font-medium text-ink"
        >
          <Target className="h-4 w-4" />
          返回仪表盘
        </Link>
      </div>
    </main>
  );
}

function getSourceTypeLabel(sourceType: "weak" | "secondary" | "random") {
  if (sourceType === "weak") {
    return "薄弱题型";
  }

  if (sourceType === "secondary") {
    return "次薄弱题型";
  }

  return "随机挑战";
}

function getStatusClassName(status: "pending" | "completed") {
  const base = "rounded-md px-3 py-2 text-sm";

  if (status === "completed") {
    return `${base} bg-moss/10 text-moss`;
  }

  return `${base} bg-paper text-ink/65`;
}
