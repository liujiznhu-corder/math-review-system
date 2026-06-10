import { jsonData, requireStudentApiUser } from "@/app/api/student/_utils";
import { practiceApiError } from "@/app/api/student/practice/_utils";
import { getPracticeOptions } from "@/services/student/practice";

export const dynamic = "force-dynamic";

// Mini program usage: call GET /api/student/practice/options before starting
// special training. The response contains the cascading question-type options
// and the available teacher-problem count for each level-3 type.
export async function GET() {
  const auth = await requireStudentApiUser();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    return jsonData(await getPracticeOptions());
  } catch (error) {
    return practiceApiError(error);
  }
}
