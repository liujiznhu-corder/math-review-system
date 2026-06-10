import { ReviewSessionWorkspace } from "@/components/reviews/ReviewSessionWorkspace";
import { redirectTeacherToDashboard } from "@/lib/roles";
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
  const [reviewTasks, completedTodayCount] = await Promise.all([
    getTodayReviewTasks(),
    getCompletedTodayCount()
  ]);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-clay">今日复习</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">待复习错题</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">
            一次专注一道题，可以用题号导航自由切换，查看答案后再判断掌握情况。
          </p>
        </div>
      </div>

      {params?.message ? (
        <p className="mt-6 rounded-md border border-moss/20 bg-white px-4 py-3 text-sm text-moss">
          {params.message}
        </p>
      ) : null}

      <ReviewSessionWorkspace
        initialTasks={reviewTasks}
        completedTodayCount={completedTodayCount}
      />
    </main>
  );
}
