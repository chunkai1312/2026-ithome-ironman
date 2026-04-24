import { randomUUID } from "node:crypto";
import type { ApplicationSession, TenantContext } from "./types.js";

const sessions = new Map<string, ApplicationSession>();

function createId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

export function createApplicationSession(
  identity: TenantContext,
  runtimeId: string,
): ApplicationSession {
  const session: ApplicationSession = {
    id: createId("session"),
    tenantId: identity.tenantId,
    ownerId: identity.userId,
    runtimeId,
    runtimeSessionId: createId("runtime"),
    createdAt: new Date().toISOString(),
  };

  sessions.set(session.id, session);
  return session;
}

export function getApplicationSession(
  sessionId: string,
): ApplicationSession | undefined {
  return sessions.get(sessionId);
}

export function getOwnedSession(
  sessionId: string,
  identity: TenantContext,
): ApplicationSession | undefined {
  const session = sessions.get(sessionId);

  if (
    !session ||
    session.tenantId !== identity.tenantId ||
    session.ownerId !== identity.userId
  ) {
    return undefined;
  }

  return session;
}

export function deleteApplicationSession(sessionId: string): void {
  sessions.delete(sessionId);
}
