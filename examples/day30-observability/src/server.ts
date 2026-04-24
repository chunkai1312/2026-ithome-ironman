import express, { type Request, type Response } from "express";
import { resolveDemoIdentity } from "./identity.js";
import {
  cancelRun,
  createRun,
  getRun,
  getRunEvents,
  isTerminalRunStatus,
  markRunCancelling,
  publishRunEvent,
  restoreRunRunning,
  subscribeRunEvents,
} from "./run-store.js";
import {
  abortRuntimeSession,
  createRuntimeSession,
  selectRuntimeId,
  startRuntimePool,
} from "./runtime-pool.js";
import {
  createApplicationSession,
  deleteApplicationSession,
  getOwnedSession,
} from "./store.js";
import { startWorkers } from "./worker.js";
import type {
  ApplicationRun,
  ApplicationSession,
  RunEvent,
  TenantContext,
} from "./types.js";

const app = express();
app.use(express.json());

const port = Number.parseInt(process.env.PORT ?? "3000", 10);

function getIdentity(
  req: Request,
  res: Response,
): TenantContext | undefined {
  const identity = resolveDemoIdentity(req);

  if (!identity) {
    res.status(401).json({
      error: "需要提供示範身分資訊",
    });
    return undefined;
  }

  return identity;
}

function getOwnedRun(
  runId: string,
  identity: TenantContext,
): ApplicationRun | undefined {
  const run = getRun(runId);

  if (!run) {
    return undefined;
  }

  const session = getOwnedSession(run.sessionId, identity);
  return session ? run : undefined;
}

function toSessionResponse(session: ApplicationSession) {
  return {
    id: session.id,
    createdAt: session.createdAt,
  };
}

function toRunResponse(run: ApplicationRun) {
  return {
    id: run.id,
    sessionId: run.sessionId,
    status: run.status,
    output: run.output,
    error: run.error,
    createdAt: run.createdAt,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
  };
}

function writeRunEvent(res: Response, event: RunEvent): void {
  res.write(`id: ${event.sequence}\n`);
  res.write(`event: ${event.type}\n`);
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

function isTerminalRunEvent(event: RunEvent): boolean {
  return (
    event.type === "run.completed" ||
    event.type === "run.failed" ||
    event.type === "run.cancelled"
  );
}

app.post("/api/sessions", async (req, res) => {
  const identity = getIdentity(req, res);

  if (!identity) {
    return;
  }

  const runtimeId = selectRuntimeId();
  const session = createApplicationSession(identity, runtimeId);

  try {
    await createRuntimeSession(session);
    res.status(201).json(toSessionResponse(session));
  } catch (error) {
    deleteApplicationSession(session.id);
    console.error(error);

    res.status(502).json({
      error: "無法建立 Runtime Session",
    });
  }
});

app.get("/api/sessions/:sessionId", (req, res) => {
  const identity = getIdentity(req, res);

  if (!identity) {
    return;
  }

  const session = getOwnedSession(req.params.sessionId, identity);

  if (!session) {
    res.status(404).json({
      error: "找不到 Session",
    });
    return;
  }

  res.json(toSessionResponse(session));
});

app.post("/api/sessions/:sessionId/runs", (req, res) => {
  const identity = getIdentity(req, res);

  if (!identity) {
    return;
  }

  const prompt =
    typeof req.body.prompt === "string"
      ? req.body.prompt.trim()
      : "";

  if (!prompt) {
    res.status(400).json({
      error: "prompt is required",
    });
    return;
  }

  const session = getOwnedSession(req.params.sessionId, identity);

  if (!session) {
    res.status(404).json({
      error: "找不到 Session",
    });
    return;
  }

  const run = createRun(session.id, prompt);

  publishRunEvent(run.id, { type: "run.queued" });
  res.status(202).json(toRunResponse(run));
});

app.get("/api/runs/:runId", (req, res) => {
  const identity = getIdentity(req, res);

  if (!identity) {
    return;
  }

  const run = getOwnedRun(req.params.runId, identity);

  if (!run) {
    res.status(404).json({
      error: "找不到 Run",
    });
    return;
  }

  res.json(toRunResponse(run));
});

app.get("/api/runs/:runId/events", (req, res) => {
  const identity = getIdentity(req, res);

  if (!identity) {
    return;
  }

  const run = getOwnedRun(req.params.runId, identity);

  if (!run) {
    res.status(404).json({
      error: "找不到 Run",
    });
    return;
  }

  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();

  const lastEventId = Number(req.header("Last-Event-ID")) || 0;
  let unsubscribe = () => {};
  let replaying = true;
  const pendingEvents: RunEvent[] = [];

  const sendEvent = (event: RunEvent) => {
    writeRunEvent(res, event);

    if (isTerminalRunEvent(event)) {
      unsubscribe();
      res.end();
    }
  };

  const onEvent = (event: RunEvent) => {
    if (replaying) {
      pendingEvents.push(event);
      return;
    }

    sendEvent(event);
  };

  unsubscribe = subscribeRunEvents(run.id, onEvent);

  const history = getRunEvents(run.id, lastEventId);
  let lastSequence = lastEventId;

  for (const event of history) {
    sendEvent(event);
    lastSequence = event.sequence;

    if (isTerminalRunEvent(event)) {
      return;
    }
  }

  replaying = false;

  for (const event of pendingEvents) {
    if (event.sequence <= lastSequence) {
      continue;
    }

    sendEvent(event);
    lastSequence = event.sequence;

    if (isTerminalRunEvent(event)) {
      return;
    }
  }

  const current = getRun(run.id);

  if (current && isTerminalRunStatus(current.status)) {
    unsubscribe();
    res.end();
    return;
  }

  req.on("close", unsubscribe);
});

app.post("/api/runs/:runId/cancel", async (req, res) => {
  const identity = getIdentity(req, res);

  if (!identity) {
    return;
  }

  const run = getOwnedRun(req.params.runId, identity);

  if (!run) {
    res.status(404).json({
      error: "找不到 Run",
    });
    return;
  }

  const session = getOwnedSession(run.sessionId, identity);

  if (!session) {
    res.status(404).json({
      error: "找不到 Run",
    });
    return;
  }

  if (isTerminalRunStatus(run.status)) {
    res.status(409).json({
      error: "Run 已經結束",
      run: toRunResponse(run),
    });
    return;
  }

  if (run.status === "queued") {
    const cancelled = cancelRun(run.id);

    if (cancelled) {
      publishRunEvent(run.id, { type: "run.cancelled" });
    }

    res.status(202).json(toRunResponse(cancelled ?? run));
    return;
  }

  if (run.status === "cancelling") {
    res.status(202).json(toRunResponse(run));
    return;
  }

  const cancelling = markRunCancelling(run.id);

  if (!cancelling) {
    res.status(409).json({
      error: "目前無法取消 Run",
    });
    return;
  }

  publishRunEvent(run.id, { type: "run.cancelling" });

  try {
    await abortRuntimeSession(session);
    res
      .status(202)
      .json(toRunResponse(getRun(run.id) ?? cancelling));
  } catch (error) {
    console.error(error);

    const current = getRun(run.id);

    if (current && !isTerminalRunStatus(current.status)) {
      restoreRunRunning(run.id);
      publishRunEvent(run.id, {
        type: "run.cancel_failed",
        error: "無法中止 Runtime 執行",
      });
    }

    res.status(502).json({
      error: "無法取消 Agent Run",
    });
  }
});

await startRuntimePool();
startWorkers(2);

app.listen(port, () => {
  console.log(`Agent service listening on http://localhost:${port}`);
});
