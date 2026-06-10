import { jsonData, requireStudentApiUser } from "@/app/api/student/_utils";
import {
  practiceApiError,
  validationError
} from "@/app/api/student/practice/_utils";
import { createPracticeSession } from "@/services/student/practice";

export const dynamic = "force-dynamic";

// Mini program usage: call POST /api/student/practice/sessions with
// { questionTypeId } to create a fixed 5-question special-training session.
export async function POST(request: Request) {
  const auth = await requireStudentApiUser();

  if (!auth.ok) {
    return auth.response;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return validationError("Invalid JSON body");
  }

  const questionTypeId =
    typeof body === "object" && body !== null && "questionTypeId" in body
      ? String(body.questionTypeId ?? "").trim()
      : "";

  try {
    return jsonData(
      await createPracticeSession({
        userId: auth.userId,
        questionTypeId
      })
    );
  } catch (error) {
    return practiceApiError(error);
  }
}
