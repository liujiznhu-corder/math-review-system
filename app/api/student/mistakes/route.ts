import { getStudentMistakesPageData } from "@/services/student/mistakes";
import {
  jsonData,
  jsonError,
  requireStudentApiUser
} from "@/app/api/student/_utils";

export const dynamic = "force-dynamic";

// Mini program usage: call GET /api/student/mistakes, optionally with
// ?questionTypeId=<uuid>, to list only the current student's mistakes.
export async function GET(request: Request) {
  const auth = await requireStudentApiUser();

  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const questionTypeId = searchParams.get("questionTypeId") ?? "";

  try {
    const { error, ...data } = await getStudentMistakesPageData(
      questionTypeId,
      auth.userId
    );

    if (error) {
      return jsonError("SERVER_ERROR", error.message, 500);
    }

    return jsonData(data);
  } catch (error) {
    return jsonError(
      "SERVER_ERROR",
      error instanceof Error ? error.message : "Failed to load mistakes",
      500
    );
  }
}
