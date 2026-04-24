export type TenantContext = {
  tenantId: string;
  userId: string;
};

export type ApplicationSession = {
  id: string;
  tenantId: string;
  ownerId: string;
  runtimeId: string;
  runtimeSessionId: string;
  createdAt: string;
};

export type RunStatus =
  | "queued"
  | "running"
  | "cancelling"
  | "completed"
  | "failed"
  | "cancelled";

export type ApplicationRun = {
  id: string;
  sessionId: string;
  status: RunStatus;
  prompt: string;
  runtimeMessageId?: string;
  workerId?: string;
  output?: string;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
};

export type RunEventData =
  | { type: "run.queued" }
  | { type: "run.started" }
  | { type: "run.output.delta"; delta: string }
  | { type: "run.cancelling" }
  | { type: "run.cancel_failed"; error: string }
  | { type: "run.completed"; output?: string }
  | { type: "run.failed"; error: string }
  | { type: "run.cancelled" };

export type RunEvent = RunEventData & {
  sequence: number;
  runId: string;
  timestamp: string;
};
