import { NextResponse } from "next/server";
import { canManageQuestionTypes, getCurrentUserRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

type StudentApiAuthResult =
  | {
      ok: true;
      userId: string;
    }
  | {
      ok: false;
      response: NextResponse;
    };

export async function requireStudentApiUser(): Promise<StudentApiAuthResult> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: jsonError("Unauthorized", 401)
    };
  }

  const role = await getCurrentUserRole();

  if (canManageQuestionTypes(role)) {
    return {
      ok: false,
      response: jsonError("Student APIs are not available to teacher/admin", 403)
    };
  }

  return {
    ok: true,
    userId: user.id
  };
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json(
    {
      ok: false,
      error: message
    },
    { status }
  );
}

export function jsonData<T>(data: T) {
  return NextResponse.json({
    ok: true,
    data
  });
}
