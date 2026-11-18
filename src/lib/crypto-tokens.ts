import { createHash, randomBytes } from "node:crypto";

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function newRawToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}
