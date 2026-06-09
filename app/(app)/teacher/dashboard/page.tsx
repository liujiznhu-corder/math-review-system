import { redirectStudentToDashboard } from "@/lib/roles";
import { TeacherDashboard } from "../../dashboard/page";

export const dynamic = "force-dynamic";

export default async function TeacherDashboardPage() {
  await redirectStudentToDashboard();

  return <TeacherDashboard />;
}
