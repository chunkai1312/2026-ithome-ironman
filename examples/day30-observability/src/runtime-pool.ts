import {
  CopilotClient,
  RuntimeConnection,
  type CopilotSession,
  type ProviderConfig,
} from "@github/copilot-sdk";
import { getCurrentTraceContext } from "./telemetry.js";
import { getServiceStatus } from "./tools.js";
import type { ApplicationSession } from "./types.js";

type RuntimeInstance = {
  id: string;
  url: string;
  client: CopilotClient;
  sessions: Map<string, CopilotSession>;
};

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
  wireApi: "responses",
};

const runtimeDefinitions = [
  {
    id: "runtime-1",
    url: process.env.COPILOT_RUNTIME_1_URL ?? "localhost:4321",
  },
  {
    id: "runtime-2",
    url: process.env.COPILOT_RUNTIME_2_URL ?? "localhost:4322",
  },
];

const runtimes = new Map<string, RuntimeInstance>(
  runtimeDefinitions.map(({ id, url }): [string, RuntimeInstance] => {
    const client = new CopilotClient({
      mode: "empty",
      connection: RuntimeConnection.forUri(url),
      onGetTraceContext: getCurrentTraceContext,
    });

    return [
      id,
      {
        id,
        url,
        client,
        sessions: new Map<string, CopilotSession>(),
      },
    ];
  }),
);

let nextRuntimeIndex = 0;

function getRuntime(runtimeId: string): RuntimeInstance {
  const runtime = runtimes.get(runtimeId);

  if (!runtime) {
    throw new Error(`找不到 Runtime: ${runtimeId}`);
  }

  return runtime;
}

export async function startRuntimePool(): Promise<void> {
  await Promise.all(
    [...runtimes.values()].map((runtime) => runtime.client.start()),
  );
}

export function selectRuntimeId(): string {
  const definitions = [...runtimes.values()];

  if (definitions.length === 0) {
    throw new Error("目前沒有可用的 Runtime");
  }

  const runtime = definitions[nextRuntimeIndex % definitions.length];
  nextRuntimeIndex += 1;
  return runtime.id;
}

export async function createRuntimeSession(
  session: ApplicationSession,
): Promise<void> {
  const runtime = getRuntime(session.runtimeId);
  const runtimeSession = await runtime.client.createSession({
    sessionId: session.runtimeSessionId,
    model,
    provider,
    streaming: true,
    tools: [getServiceStatus],
    availableTools: ["custom:get_service_status"],
  });

  runtime.sessions.set(session.runtimeSessionId, runtimeSession);
  console.log(`[runtime] session=${session.id} runtime=${runtime.id}`);
}

export async function getRuntimeSession(
  session: ApplicationSession,
): Promise<CopilotSession> {
  const runtime = getRuntime(session.runtimeId);
  const current = runtime.sessions.get(session.runtimeSessionId);

  if (current) {
    return current;
  }

  const resumed = await runtime.client.resumeSession(
    session.runtimeSessionId,
    {
      model,
      provider,
      streaming: true,
      tools: [getServiceStatus],
      availableTools: ["custom:get_service_status"],
    },
  );

  runtime.sessions.set(session.runtimeSessionId, resumed);
  return resumed;
}

export async function abortRuntimeSession(
  session: ApplicationSession,
): Promise<void> {
  const runtimeSession = await getRuntimeSession(session);
  await runtimeSession.abort();
}
