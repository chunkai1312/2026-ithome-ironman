import type { Request } from "express";
import type { TenantContext } from "./types.js";

const demoIdentities = new Set([
  "tenant-a:user-a",
  "tenant-b:user-b",
]);

export function resolveDemoIdentity(req: Request): TenantContext | undefined {
  const tenantId = req.header("x-demo-tenant-id");
  const userId = req.header("x-demo-user-id");

  if (!tenantId || !userId) {
    return undefined;
  }

  const identity = { tenantId, userId };
  const key = `${tenantId}:${userId}`;

  return demoIdentities.has(key) ? identity : undefined;
}
