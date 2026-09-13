import { TripErrorCode } from "@dolan/shared";
import type { ZodError } from "zod";
import { badRequest } from "../../lib/api-error.ts";
import { zodFields } from "../../lib/zod-fields.ts";

export function tripMutationError(error: ZodError, fallbackMessage = "Invalid trip") {
  const fields = zodFields(error);
  const keys = Object.keys(fields);
  if (keys.some((key) => key === "startDate" || key === "endDate")) {
    return badRequest(TripErrorCode.INVALID_DATE, "Invalid date", fields);
  }
  if (keys.some((key) => key === "budgetAmount" || key === "budgetBasis")) {
    return badRequest(TripErrorCode.INVALID_BUDGET, "Invalid budget", fields);
  }
  return badRequest(TripErrorCode.INVALID_PLAN_INPUT, fallbackMessage, fields);
}
