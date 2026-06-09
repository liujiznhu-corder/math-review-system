import { getStudentMistakeAnswerData } from "@/services/student/solutions";
import {
  jsonData,
  jsonError,
  requireStudentApiUser
} from "@/app/api/student/_utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireStudentApiUser();

  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const mistakeId = searchParams.get("mistakeId") ?? searchParams.get("id");

  if (!mistakeId) {
    return jsonError("Missing mistakeId");
  }

  try {
    const data = await getStudentMistakeAnswerData({
      mistakeId,
      userId: auth.userId,
      canManage: false
    });

    if (!data) {
      return jsonError("Solution not found", 404);
    }

    return jsonData(data);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to load solution",
      500
    );
  }
}
