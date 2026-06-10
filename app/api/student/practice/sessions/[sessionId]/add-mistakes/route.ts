import { jsonData, requireStudentApiUser } from "@/app/api/student/_utils";
import {
  practiceApiError,
  validationError
} from "@/app/api/student/practice/_utils";
import { addPracticeMistakes } from "@/services/student/practice";

export const dynamic = "force-dynamic";

// Mini program usage: call POST /api/student/practice/sessions/[sessionId]/add-mistakes
// with { recordIds: ["record-id"] } from the training summary page. Only the
// selected not_mastered records are converted into mistakes for this student.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const auth = await requireStudentApiUser();

  if (!auth.ok) {
    return auth.response;
  }

  const { sessionId } = await params;
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return validationError("Invalid JSON body");
  }

  const recordIds =
    typeof body === "object" && body !== null && "recordIds" in body
      ? body.recordIds
      : null;

  if (
    !Array.isArray(recordIds) ||
    !recordIds.every((id) => typeof id === "string")
  ) {
    return validationError("recordIds must be a string array");
  }

  try {
    return jsonData(
      await addPracticeMistakes({
        userId: auth.userId,
        sessionId,
        recordIds
      })
    );
  } catch (error) {
    return practiceApiError(error);
  }
}
