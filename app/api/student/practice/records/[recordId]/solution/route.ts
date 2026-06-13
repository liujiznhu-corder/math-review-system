import { jsonData, requireStudentApiUser } from "@/app/api/student/_utils";
import { practiceApiError } from "@/app/api/student/practice/_utils";
import { getPracticeRecordSolution } from "@/services/student/practice";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ recordId: string }> }
) {
  const auth = await requireStudentApiUser();

  if (!auth.ok) {
    return auth.response;
  }

  const { recordId } = await params;

  try {
    return jsonData(await getPracticeRecordSolution(auth.userId, recordId));
  } catch (error) {
    return practiceApiError(error);
  }
}
