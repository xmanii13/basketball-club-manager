import { headers } from "next/headers";
import {
  getIdentity,
  type Identity,
  type IdentityStage,
  type PersonIdentity,
} from "../../cursor/identity";

export type AppStage = IdentityStage;

/** Resolve the signed-in viewer from the current request headers (RSC / route). */
export async function readIdentity(): Promise<Identity> {
  return getIdentity(await headers());
}

export async function readIdentityFromRequest(
  request: Request,
): Promise<Identity> {
  return getIdentity(request);
}

export function asPerson(
  identity: Identity,
): PersonIdentity | null {
  if (!identity.verified || identity.kind !== "person") return null;
  return identity;
}

export function stageFor(identity: PersonIdentity | null): AppStage {
  return identity?.stage ?? "production";
}
