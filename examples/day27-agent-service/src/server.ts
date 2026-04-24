import express from "express";
import {
  createApplicationSession,
  deleteApplicationSession,
  getOwnedSession,
} from "./store.js";
import { createRuntimeSession, sendMessage } from "./runtime.js";
import type { ApplicationSession } from "./types.js";

const app = express();
app.use(express.json());

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const currentUser = { id: "demo-user" };
const activeMessageSessions = new Set<string>();

function toSessionResponse(session: ApplicationSession) {
  return {
    id: session.id,
    createdAt: session.createdAt,
  };
}

app.post("/api/sessions", async (_req, res) => {
  const session = createApplicationSession(currentUser.id);

  try {
    await createRuntimeSession(session);
    res.status(201).json(toSessionResponse(session));
  } catch (error) {
    deleteApplicationSession(session.id);
    console.error(error);
    res.status(502).json({ error: "Unable to create Runtime Session" });
  }
});

app.get("/api/sessions/:sessionId", (req, res) => {
  const session = getOwnedSession(req.params.sessionId, currentUser.id);

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json(toSessionResponse(session));
});

app.post("/api/sessions/:sessionId/messages", async (req, res) => {
  const message =
    typeof req.body.message === "string" ? req.body.message.trim() : "";

  if (!message) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const session = getOwnedSession(req.params.sessionId, currentUser.id);

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  if (activeMessageSessions.has(session.id)) {
    res.status(409).json({
      error: "Session is already processing a message",
    });
    return;
  }

  activeMessageSessions.add(session.id);

  try {
    const content = await sendMessage(session.runtimeSessionId, message);
    res.json({ sessionId: session.id, content });
  } catch (error) {
    console.error(error);
    res.status(502).json({ error: "Unable to execute Agent request" });
  } finally {
    activeMessageSessions.delete(session.id);
  }
});

app.listen(port, () => {
  console.log(`Agent service listening on http://localhost:${port}`);
});
