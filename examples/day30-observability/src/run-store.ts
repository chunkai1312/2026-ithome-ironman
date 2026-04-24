import { randomUUID } from "node:crypto";
import type {
  ApplicationRun,
  RunEvent,
  RunEventData,
  RunStatus,
} from "./types.js";

type RunEventListener = (event: RunEvent) => void;

const runs = new Map<string, ApplicationRun>();
const activeRunBySession = new Map<string, string>();
const eventsByRun = new Map<string, RunEvent[]>();
const listenersByRun = new Map<string, Set<RunEventListener>>();
const terminalStatuses = new Set<RunStatus>([
  "completed",
  "failed",
  "cancelled",
]);

function createId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

function updateRun(
  runId: string,
  patch: Partial<ApplicationRun>,
): ApplicationRun | undefined {
  const current = runs.get(runId);

  if (!current) {
    return undefined;
  }

  const updated = { ...current, ...patch };
  runs.set(runId, updated);
  return updated;
}

function releaseActiveRun(run: ApplicationRun): void {
  if (activeRunBySession.get(run.sessionId) === run.id) {
    activeRunBySession.delete(run.sessionId);
  }
}

export function isTerminalRunStatus(status: RunStatus): boolean {
  return terminalStatuses.has(status);
}

export function createRun(sessionId: string, prompt: string): ApplicationRun {
  const run: ApplicationRun = {
    id: createId("run"),
    sessionId,
    status: "queued",
    prompt,
    createdAt: new Date().toISOString(),
  };

  runs.set(run.id, run);
  eventsByRun.set(run.id, []);
  return run;
}

export function getRun(runId: string): ApplicationRun | undefined {
  return runs.get(runId);
}

export function claimNextRun(workerId: string): ApplicationRun | undefined {
  for (const run of runs.values()) {
    if (run.status !== "queued") {
      continue;
    }

    if (activeRunBySession.has(run.sessionId)) {
      continue;
    }

    const claimed = updateRun(run.id, {
      status: "running",
      workerId,
      startedAt: new Date().toISOString(),
    });

    if (!claimed) {
      continue;
    }

    activeRunBySession.set(run.sessionId, run.id);
    return claimed;
  }

  return undefined;
}

export function setRuntimeMessageId(
  runId: string,
  runtimeMessageId: string,
): void {
  updateRun(runId, { runtimeMessageId });
}

export function setRunOutput(runId: string, output: string): void {
  updateRun(runId, { output });
}

export function markRunCancelling(
  runId: string,
): ApplicationRun | undefined {
  const run = runs.get(runId);

  if (!run || run.status !== "running") {
    return undefined;
  }

  return updateRun(runId, { status: "cancelling" });
}

export function restoreRunRunning(
  runId: string,
): ApplicationRun | undefined {
  const run = runs.get(runId);

  if (!run || run.status !== "cancelling") {
    return run;
  }

  return updateRun(runId, { status: "running" });
}

export function completeRun(runId: string): ApplicationRun | undefined {
  const run = runs.get(runId);

  if (!run || terminalStatuses.has(run.status)) {
    return run;
  }

  const completed = updateRun(runId, {
    status: "completed",
    completedAt: new Date().toISOString(),
  });

  if (completed) {
    releaseActiveRun(completed);
  }

  return completed;
}

export function failRun(
  runId: string,
  error: string,
): ApplicationRun | undefined {
  const run = runs.get(runId);

  if (!run || terminalStatuses.has(run.status)) {
    return run;
  }

  const failed = updateRun(runId, {
    status: "failed",
    error,
    completedAt: new Date().toISOString(),
  });

  if (failed) {
    releaseActiveRun(failed);
  }

  return failed;
}

export function cancelRun(runId: string): ApplicationRun | undefined {
  const run = runs.get(runId);

  if (!run || terminalStatuses.has(run.status)) {
    return run;
  }

  const cancelled = updateRun(runId, {
    status: "cancelled",
    completedAt: new Date().toISOString(),
  });

  if (cancelled) {
    releaseActiveRun(cancelled);
  }

  return cancelled;
}

export function publishRunEvent(
  runId: string,
  data: RunEventData,
): RunEvent {
  const history = eventsByRun.get(runId) ?? [];
  const event: RunEvent = {
    ...data,
    sequence: history.length + 1,
    runId,
    timestamp: new Date().toISOString(),
  };

  history.push(event);
  eventsByRun.set(runId, history);

  for (const listener of listenersByRun.get(runId) ?? []) {
    try {
      listener(event);
    } catch {
      // 單一 SSE Client 的問題不影響 Run 狀態更新。
    }
  }

  return event;
}

export function getRunEvents(
  runId: string,
  afterSequence = 0,
): RunEvent[] {
  return (eventsByRun.get(runId) ?? []).filter(
    (event) => event.sequence > afterSequence,
  );
}

export function subscribeRunEvents(
  runId: string,
  listener: RunEventListener,
): () => void {
  const listeners =
    listenersByRun.get(runId) ?? new Set<RunEventListener>();

  listeners.add(listener);
  listenersByRun.set(runId, listeners);

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0) {
      listenersByRun.delete(runId);
    }
  };
}
