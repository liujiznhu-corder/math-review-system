import {
  jsonError,
  type StudentApiErrorCode
} from "@/app/api/student/_utils";
import { StudentPracticeError } from "@/services/student/practice";

export function practiceApiError(error: unknown) {
  if (error instanceof StudentPracticeError) {
    return jsonError(error.code, error.message, error.status);
  }

  return jsonError(
    "SERVER_ERROR",
    error instanceof Error ? error.message : "Failed to process practice request",
    500
  );
}

export function validationError(message: string) {
  return jsonError("VALIDATION_ERROR" satisfies StudentApiErrorCode, message);
}
