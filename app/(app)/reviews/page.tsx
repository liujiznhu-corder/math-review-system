import Link from "next/link";
import { CheckCircle2, Eye, XCircle } from "lucide-react";
import { LatexProblemRenderer } from "@/components/problems/LatexProblemRenderer";
import { redirectTeacherToDashboard } from "@/lib/roles";
import { completeReviewTask } from "@/app/(app)/reviews/actions";
import {
  getCompletedTodayCount,
  getTodayReviewTasks
} from "@/services/student/reviews";

type ReviewsPageProps = {
  searchParams?: Promise<{
    message?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ReviewsPage({ searchParams }: ReviewsPageProps) {
  await redirectTeacherToDashboard();

  const params = await searchParams;
  const reviewTasks = await getTodayReviewTasks();
  const completedTodayCount = await getCompletedTodayCount();

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-clay">今日复习</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">待复习错题</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">
            展示今天及以前到期、尚未完成的复习任务。
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border border-ink/10 bg-white px-4 py-3">
            <p className="text-xs text-ink/55">今日待复习</p>
            <p className="mt-1 text-xl font-semibold text-ink">
              {reviewTasks.length}
            </p>
          </div>
          <div className="rounded-md border border-ink/10 bg-white px-4 py-3">
            <p className="text-xs text-ink/55">今日已完成</p>
            <p className="mt-1 text-xl font-semibold text-ink">
              {completedTodayCount}
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
        {reviewTasks.length === 0 ? (
          <div className="rounded-md border border-dashed border-ink/20 bg-white px-5 py-10 text-center text-sm text-ink/60">
            今天暂无待复习错题。
          </div>
        ) : (
          <div className="space-y-4">
            {reviewTasks.map((task) => {
              const mistake = task.mistake;
              const questionType = mistake?.questionType;

              return (
                <article
                  key={task.id}
                  className="rounded-md border border-ink/10 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm text-ink/55">
                        {questionType
                          ? `${questionType.level1} / ${questionType.level2}`
                          : "未分类"}
                      </p>
                      <h2 className="mt-1 text-base font-semibold text-ink">
                        {questionType?.level3 ?? "未确认题型"}
                      </h2>
                    </div>
                    <p className="rounded-md bg-paper px-3 py-2 text-sm text-ink/65">
                      {getReviewRoundLabel(task.reviewRound)} ·{" "}
                      {task.reviewDate}
                    </p>
                  </div>

                  <div className="mt-4 rounded-md bg-paper p-4">
                    {mistake?.inputType === "latex" ? (
                      <LatexProblemRenderer
                        rawLatex={mistake.rawLatex ?? mistake.latexContent}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap text-sm leading-6 text-ink/75">
                        {mistake?.rawText || mistake?.stem}
                      </p>
                    )}
                  </div>

                  {mistake?.note ? (
                    <p className="mt-3 text-sm leading-6 text-ink/65">
                      学生备注：{mistake.note}
                    </p>
                  ) : null}

                  <p className="mt-5 text-sm text-ink/55">
                    建议先查看答案解析，再选择本次复习结果。
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    {mistake ? (
                      <Link
                        href={`/mistakes/${mistake.id}/answer`}
                        className="inline-flex h-10 items-center gap-2 rounded-md border border-ink/15 bg-white px-4 text-sm font-medium text-ink"
                      >
                        <Eye className="h-4 w-4" />
                        查看答案
                      </Link>
                    ) : null}
                    <form action={completeReviewTask}>
                      <input type="hidden" name="taskId" value={task.id} />
                      <button
                        type="submit"
                        name="result"
                        value="mastered"
                        className="inline-flex h-10 items-center gap-2 rounded-md bg-moss px-4 text-sm font-medium text-white"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        已掌握
                      </button>
                    </form>
                    <form action={completeReviewTask}>
                      <input type="hidden" name="taskId" value={task.id} />
                      <button
                        type="submit"
                        name="result"
                        value="not_mastered"
                        className="inline-flex h-10 items-center gap-2 rounded-md border border-clay/25 bg-clay/10 px-4 text-sm font-medium text-clay"
                      >
                        <XCircle className="h-4 w-4" />
                        未掌握
                      </button>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function getReviewRoundLabel(reviewRound: string) {
  const labels: Record<string, string> = {
    day1: "第1天",
    day3: "第3天",
    day7: "第7天",
    day14: "第14天",
    day30: "第30天",
    retry_day3: "补复习第3天",
    retry_day7: "补复习第7天"
  };

  return labels[reviewRound] ?? reviewRound;
}
