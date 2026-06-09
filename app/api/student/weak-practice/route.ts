import { getTodayWeakPracticeData } from "@/services/student/weak-practice";
import {
  jsonData,
  jsonError,
  requireStudentApiUser
} from "@/app/api/student/_utils";

export const dynamic = "force-dynamic";

// Mini program usage: call GET /api/student/weak-practice to create or fetch
// today's weak-practice tasks for the current student.
export async function GET() {
  const auth = await requireStudentApiUser();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    return jsonData(await getTodayWeakPracticeData(auth.userId));
  } catch (error) {
    return jsonError(
      "SERVER_ERROR",
      error instanceof Error ? error.message : "Failed to load weak practice",
      500
    );
  }
}
