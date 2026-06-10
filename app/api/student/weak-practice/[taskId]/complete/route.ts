import {
  jsonData,
  jsonError,
  requireStudentApiUser
} from "@/app/api/student/_utils";
import { completeWeakPracticeTask } from "@/services/weak-practice";

export const dynamic = "force-dynamic";

// Mini program usage: call POST /api/student/weak-practice/[taskId]/complete
// with { result: "mastered" | "not_mastered" } after the student checks a
// daily weak-practice problem and gives self-assessment feedback.
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
      await completeWeakPracticeTask({
        taskId,
        userId: auth.userId,
        result
      })
    );
  } catch (error) {
    return jsonError(
      "SERVER_ERROR",
      error instanceof Error
        ? error.message
        : "Failed to complete weak practice task",
      500
    );
  }
}
