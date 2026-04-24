import { CopilotClient, RuntimeConnection } from "@github/copilot-sdk";

type RuntimeMode = "bundled" | "local" | "external";

function getRuntimeMode(): RuntimeMode {
  const mode = process.env.RUNTIME_MODE ?? "bundled";

  if (mode === "bundled" || mode === "local" || mode === "external") {
    return mode;
  }

  throw new Error(`不支援的 RUNTIME_MODE: ${mode}`);
}

function createClient(mode: RuntimeMode): CopilotClient {
  if (mode === "bundled") {
    return new CopilotClient();
  }

  if (mode === "local") {
    const cliPath = process.env.LOCAL_COPILOT_PATH;

    if (!cliPath) {
      throw new Error("LOCAL_COPILOT_PATH is required");
    }

    return new CopilotClient({
      connection: RuntimeConnection.forStdio({ path: cliPath }),
    });
  }

  const runtimeUrl = process.env.COPILOT_RUNTIME_URL ?? "localhost:4321";

  return new CopilotClient({
    connection: RuntimeConnection.forUri(runtimeUrl),
  });
}

const mode = getRuntimeMode();
const client = createClient(mode);

console.log(`[runtime] mode=${mode}`);

const session = await client.createSession({
  model: "auto",
  availableTools: [],
});

const response = await session.sendAndWait(
  {
    prompt: "請用三點說明 Copilot Runtime 在後端 Agent 服務中的主要責任。",
  },
  120_000,
);

console.log(response?.data.content);

await session.disconnect();
await client.stop();
