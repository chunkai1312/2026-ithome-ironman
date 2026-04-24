import { randomUUID } from "node:crypto";
import type { ApplicationSession } from "./types.js";

const sessions = new Map<string, ApplicationSession>();

function createId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

export function createApplicationSession(ownerId: string): ApplicationSession {
  const session: ApplicationSession = {
    id: createId("session"),
    ownerId,
    runtimeSessionId: createId("runtime"),
    createdAt: new Date().toISOString(),
  };

  sessions.set(session.id, session);
  return session;
}

export function getOwnedSession(
  sessionId: string,
  ownerId: string,
): ApplicationSession | undefined {
  const session = sessions.get(sessionId);
  return session?.ownerId === ownerId ? session : undefined;
}

export function deleteApplicationSession(sessionId: string): void {
  sessions.delete(sessionId);
}
