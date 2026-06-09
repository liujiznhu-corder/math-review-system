import { getStudentDashboardData } from "@/services/student/dashboard";
import {
  jsonData,
  jsonError,
  requireStudentApiUser
} from "@/app/api/student/_utils";

export const dynamic = "force-dynamic";

// Mini program usage: call GET /api/student/dashboard with the logged-in
// Supabase session cookie; returns the current student's dashboard summary.
export async function GET() {
  const auth = await requireStudentApiUser();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { error, ...data } = await getStudentDashboardData(auth.userId);

    if (error) {
      return jsonError("SERVER_ERROR", error, 500);
    }

    return jsonData(data);
  } catch (error) {
    return jsonError(
      "SERVER_ERROR",
      error instanceof Error ? error.message : "Failed to load dashboard",
      500
    );
  }
}
