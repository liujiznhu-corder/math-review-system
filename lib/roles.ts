import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type UserRole = "admin" | "teacher" | "student";

export function canManageQuestionTypes(role: UserRole) {
  return role === "admin" || role === "teacher";
}

export async function redirectTeacherToDashboard() {
  const role = await getCurrentUserRole();

  if (canManageQuestionTypes(role)) {
    redirect("/teacher/dashboard");
  }
}

export async function redirectStudentToDashboard() {
  const role = await getCurrentUserRole();

  if (!canManageQuestionTypes(role)) {
    redirect("/dashboard");
  }
}

export async function getCurrentUserRole(): Promise<UserRole> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return "student";
  }

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return normalizeRole(data?.role);
}

export function normalizeRole(value: unknown): UserRole {
  return value === "admin" || value === "teacher" ? value : "student";
}
