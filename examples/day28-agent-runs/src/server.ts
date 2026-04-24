import express, { type Response } from "express";
import {
  createApplicationSession,
  deleteApplicationSession,
  getOwnedSession,
} from "./store.js";
import {
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
} from "./runtime.js";
import { startRun } from "./run-manager.js";
import type {
  ApplicationRun,
  ApplicationSession,
  RunEvent,
} from "./types.js";

const app = express();
app.use(express.json());

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const currentUser = { id: "demo-user" };

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

app.post("/api/sessions", async (_req, res) => {
  const session = createApplicationSession(currentUser.id);

  try {
    await createRuntimeSession(session);
    res.status(201).json(toSessionResponse(session));
  } catch (error) {
    deleteApplicationSession(session.id);
    console.error(error);

    res.status(502).json({
      error: "Unable to create Runtime Session",
    });
  }
});

app.get("/api/sessions/:sessionId", (req, res) => {
  const session = getOwnedSession(req.params.sessionId, currentUser.id);

  if (!session) {
    res.status(404).json({
      error: "Session not found",
    });
    return;
  }

  res.json(toSessionResponse(session));
});

app.post("/api/sessions/:sessionId/runs", async (req, res) => {
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

  const session = getOwnedSession(req.params.sessionId, currentUser.id);

  if (!session) {
    res.status(404).json({
      error: "Session not found",
    });
    return;
  }

  const run = createRun(session.id, prompt);

  if (!run) {
    res.status(409).json({
      error: "Session already has an active Run",
    });
    return;
  }

  try {
    await startRun(run, session.runtimeSessionId);
    res.status(202).json(toRunResponse(getRun(run.id) ?? run));
  } catch (error) {
    console.error(error);

    const failed = getRun(run.id);

    res.status(502).json({
      error: "Unable to start Agent Run",
      run: failed ? toRunResponse(failed) : undefined,
    });
  }
});

app.get("/api/runs/:runId", (req, res) => {
  const run = getRun(req.params.runId);

  if (!run) {
    res.status(404).json({
      error: "Run not found",
    });
    return;
  }

  const session = getOwnedSession(run.sessionId, currentUser.id);

  if (!session) {
    res.status(404).json({
      error: "Run not found",
    });
    return;
  }

  res.json(toRunResponse(run));
});

app.get("/api/runs/:runId/events", (req, res) => {
  const run = getRun(req.params.runId);

  if (!run) {
    res.status(404).json({
      error: "Run not found",
    });
    return;
  }

  const session = getOwnedSession(run.sessionId, currentUser.id);

  if (!session) {
    res.status(404).json({
      error: "Run not found",
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

    if (isTerminalRunEvent(event)) return;
  }

  replaying = false;

  for (const event of pendingEvents) {
    if (event.sequence <= lastSequence) continue;

    sendEvent(event);
    lastSequence = event.sequence;

    if (isTerminalRunEvent(event)) return;
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
  const run = getRun(req.params.runId);

  if (!run) {
    res.status(404).json({
      error: "Run not found",
    });
    return;
  }

  const session = getOwnedSession(run.sessionId, currentUser.id);

  if (!session) {
    res.status(404).json({
      error: "Run not found",
    });
    return;
  }

  if (isTerminalRunStatus(run.status)) {
    res.status(409).json({
      error: "Run has already finished",
      run: toRunResponse(run),
    });
    return;
  }

  if (run.status === "cancelling") {
    res.status(202).json(toRunResponse(run));
    return;
  }

  const cancelling = markRunCancelling(run.id);

  if (!cancelling) {
    res.status(409).json({
      error: "Run cannot be cancelled",
    });
    return;
  }

  publishRunEvent(run.id, {
    type: "run.cancelling",
  });

  try {
    await abortRuntimeSession(session.runtimeSessionId);
    res.status(202).json(toRunResponse(getRun(run.id) ?? cancelling));
  } catch (error) {
    console.error(error);

    const current = getRun(run.id);

    if (current && !isTerminalRunStatus(current.status)) {
      restoreRunRunning(run.id);

      publishRunEvent(run.id, {
        type: "run.cancel_failed",
        error: "Unable to abort Runtime execution",
      });
    }

    res.status(502).json({
      error: "Unable to cancel Agent Run",
    });
  }
});

app.listen(port, () => {
  console.log(`Agent service listening on http://localhost:${port}`);
});
