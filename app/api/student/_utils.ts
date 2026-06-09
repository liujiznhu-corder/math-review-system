import { NextResponse } from "next/server";
import { canManageQuestionTypes, getCurrentUserRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export type StudentApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "SERVER_ERROR";

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
      response: jsonError("UNAUTHORIZED", "请先登录", 401)
    };
  }

  const role = await getCurrentUserRole();

  if (canManageQuestionTypes(role)) {
    return {
      ok: false,
      response: jsonError("FORBIDDEN", "该接口仅允许学生账号访问", 403)
    };
  }

  return {
    ok: true,
    userId: user.id
  };
}

export function jsonError(
  code: StudentApiErrorCode,
  message: string,
  status = 400
) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message
      }
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
