import type { ZodError } from "zod";

export function zodFields(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "value";
    if (!fields[path]) fields[path] = issue.message;
  }
  return fields;
}
