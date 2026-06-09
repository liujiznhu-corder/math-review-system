import { getStudentMistakeAnswerData } from "@/services/student/solutions";
import {
  jsonData,
  jsonError,
  requireStudentApiUser
} from "@/app/api/student/_utils";

export const dynamic = "force-dynamic";

// Mini program usage: call GET /api/student/solutions?mistakeId=<uuid> to
// fetch the answer and analysis for one mistake owned by the current student.
export async function GET(request: Request) {
  const auth = await requireStudentApiUser();

  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const mistakeId = searchParams.get("mistakeId") ?? searchParams.get("id");

  if (!mistakeId) {
    return jsonError("VALIDATION_ERROR", "Missing mistakeId");
  }

  try {
    const data = await getStudentMistakeAnswerData({
      mistakeId,
      userId: auth.userId,
      canManage: false
    });

    if (!data) {
      return jsonError("NOT_FOUND", "未找到该错题答案解析", 404);
    }

    return jsonData(data);
  } catch (error) {
    return jsonError(
      "SERVER_ERROR",
      error instanceof Error ? error.message : "Failed to load solution",
      500
    );
  }
}
