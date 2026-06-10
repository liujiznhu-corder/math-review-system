import {
  jsonData,
  jsonError,
  requireStudentApiUser
} from "@/app/api/student/_utils";
import { completeTodayReviewTask } from "@/services/student/reviews";

export const dynamic = "force-dynamic";

// Mini program usage: call POST /api/student/reviews/[taskId]/complete with
// { result: "mastered" | "not_mastered" } after the student checks the answer
// and gives feedback for a due review task.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await requireStudentApiUser();

  if (!auth.ok) {
    return auth.response;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("VALIDATION_ERROR", "Invalid JSON body");
  }

  const result =
    typeof body === "object" && body !== null && "result" in body
      ? body.result
      : null;

  if (result !== "mastered" && result !== "not_mastered") {
    return jsonError(
      "VALIDATION_ERROR",
      "result must be mastered or not_mastered"
    );
  }

  const { taskId } = await params;

  try {
    return jsonData(
      await completeTodayReviewTask({
        userId: auth.userId,
        taskId,
        result
      })
    );
  } catch (error) {
    return jsonError(
      "SERVER_ERROR",
      error instanceof Error ? error.message : "Failed to complete review",
      500
    );
  }
}
