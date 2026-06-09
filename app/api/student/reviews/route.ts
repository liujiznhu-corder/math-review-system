import {
  getCompletedTodayCount,
  getTodayReviewTasks
} from "@/services/student/reviews";
import {
  jsonData,
  jsonError,
  requireStudentApiUser
} from "@/app/api/student/_utils";

export const dynamic = "force-dynamic";

// Mini program usage: call GET /api/student/reviews to fetch today's pending
// review tasks and the current student's completed count.
export async function GET() {
  const auth = await requireStudentApiUser();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const [tasks, completedTodayCount] = await Promise.all([
      getTodayReviewTasks(auth.userId),
      getCompletedTodayCount(auth.userId)
    ]);

    return jsonData({
      tasks,
      completedTodayCount
    });
  } catch (error) {
    return jsonError(
      "SERVER_ERROR",
      error instanceof Error ? error.message : "Failed to load reviews",
      500
    );
  }
}
