import { createHash, randomBytes } from "node:crypto";
import { env } from "../../config/env.ts";

export function hashShareToken(token: string) {
  return createHash("sha256").update(`${env.shareTokenSecret}:${token}`).digest("hex");
}

export function newShareToken() {
  return randomBytes(32).toString("base64url");
}
