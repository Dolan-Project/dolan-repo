import { redactValue } from "./redact.ts";

export const logger = {
  info(message: string, meta?: Record<string, unknown>) {
    console.info(JSON.stringify({ level: "info", message, ...safe(meta) }));
  },
  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(JSON.stringify({ level: "warn", message, ...safe(meta) }));
  },
  error(message: string, meta?: Record<string, unknown>) {
    console.error(JSON.stringify({ level: "error", message, ...safe(meta) }));
  },
};

function safe(meta?: Record<string, unknown>): Record<string, unknown> {
  if (!meta) return {};
  return redactValue(meta) as Record<string, unknown>;
}
