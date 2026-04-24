import {
  CopilotClient,
  RuntimeConnection,
  type CopilotSession,
  type ProviderConfig,
} from "@github/copilot-sdk";
import type { ApplicationSession } from "./types.js";

const runtimeUrl = process.env.COPILOT_RUNTIME_URL ?? "localhost:4321";
const model = process.env.MODEL_ID;
const baseUrl = process.env.MODEL_BASE_URL;
const apiKey = process.env.MODEL_API_KEY;

if (!model || !baseUrl || !apiKey) {
  throw new Error("MODEL_ID、MODEL_BASE_URL 與 MODEL_API_KEY 都必須提供。");
}

const provider: ProviderConfig = {
  type: "openai",
  baseUrl,
  apiKey,
};

const client = new CopilotClient({
  connection: RuntimeConnection.forUri(runtimeUrl),
  mode: "empty",
});

const runtimeSessions = new Map<string, CopilotSession>();

export async function createRuntimeSession(
  session: ApplicationSession,
): Promise<void> {
  const runtimeSession = await client.createSession({
    sessionId: session.runtimeSessionId,
    model,
    provider,
    streaming: true,
    availableTools: [],
  });

  runtimeSessions.set(session.runtimeSessionId, runtimeSession);
}

export async function getRuntimeSession(
  runtimeSessionId: string,
): Promise<CopilotSession> {
  const current = runtimeSessions.get(runtimeSessionId);
  if (current) return current;

  const resumed = await client.resumeSession(runtimeSessionId, {
    model,
    provider,
    streaming: true,
    availableTools: [],
  });

  runtimeSessions.set(runtimeSessionId, resumed);
  return resumed;
}

export async function abortRuntimeSession(
  runtimeSessionId: string,
): Promise<void> {
  const session = await getRuntimeSession(runtimeSessionId);
  await session.abort();
}
