import { getStudentMistakesPageData } from "@/services/student/mistakes";
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
  const questionTypeId = searchParams.get("questionTypeId") ?? "";

  try {
    return jsonData(
      await getStudentMistakesPageData(questionTypeId, auth.userId)
    );
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to load mistakes",
      500
    );
  }
}
