import { jsonData, requireStudentApiUser } from "@/app/api/student/_utils";
import { practiceApiError } from "@/app/api/student/practice/_utils";
import { getPracticeSession } from "@/services/student/practice";

export const dynamic = "force-dynamic";

// Mini program usage: call GET /api/student/practice/sessions/[sessionId] to
// resume a session and render each record with displayLatex, answer, analysis,
// and the normalized question-type path.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const auth = await requireStudentApiUser();

  if (!auth.ok) {
    return auth.response;
  }

  const { sessionId } = await params;

  try {
    return jsonData(await getPracticeSession(auth.userId, sessionId));
  } catch (error) {
    return practiceApiError(error);
  }
}
