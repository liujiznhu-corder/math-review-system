import { getStudentDashboardData } from "@/services/student/dashboard";
import {
  jsonData,
  jsonError,
  requireStudentApiUser
} from "@/app/api/student/_utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireStudentApiUser();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    return jsonData(await getStudentDashboardData(auth.userId));
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to load dashboard",
      500
    );
  }
}
