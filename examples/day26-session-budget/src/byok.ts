import { CopilotClient } from "@github/copilot-sdk";

const baseUrl = process.env.MODEL_BASE_URL;
const apiKey = process.env.MODEL_API_KEY;
const modelId = process.env.MODEL_ID;

if (!baseUrl || !apiKey || !modelId) {
  throw new Error(
    "MODEL_BASE_URL, MODEL_API_KEY and MODEL_ID are required",
  );
}

const client = new CopilotClient();

const session = await client.createSession({
  model: modelId,
  provider: {
    type: "openai",
    baseUrl,
    apiKey,
  },
  streaming: true,
  availableTools: [],
});

session.on("assistant.usage", (event) => {
  console.log(
    `[usage] model=${event.data.model} ` +
      `input=${event.data.inputTokens ?? 0} ` +
      `output=${event.data.outputTokens ?? 0}`,
  );
});

session.on("session.usage_info", (event) => {
  console.log(
    `[context] ${event.data.currentTokens}/${event.data.tokenLimit}`,
  );
});

const response = await session.sendAndWait(
  {
    prompt:
      "請用三點整理長時間 Agent 工作需要注意的模型資源使用問題。",
  },
  120_000,
);

console.log("\n模型回應：");
console.log(response?.data.content);

await session.disconnect();
await client.stop();
