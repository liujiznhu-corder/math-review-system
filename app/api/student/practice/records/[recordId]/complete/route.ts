import { jsonData, requireStudentApiUser } from "@/app/api/student/_utils";
import {
  practiceApiError,
  validationError
} from "@/app/api/student/practice/_utils";
import { completePracticeRecord } from "@/services/student/practice";

export const dynamic = "force-dynamic";

// Mini program usage: call POST /api/student/practice/records/[recordId]/complete
// with { result: "mastered" | "not_mastered" } after the student checks the
// answer and gives feedback for this special-training problem.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ recordId: string }> }
) {
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

  const result =
    typeof body === "object" && body !== null && "result" in body
      ? body.result
      : null;

  if (result !== "mastered" && result !== "not_mastered") {
    return validationError("result must be mastered or not_mastered");
  }

  const { recordId } = await params;

  try {
    return jsonData(
      await completePracticeRecord({
        userId: auth.userId,
        recordId,
        result
      })
    );
  } catch (error) {
    return practiceApiError(error);
  }
}
