import { CopilotClient } from "@github/copilot-sdk";

const baseUrl = process.env.MODEL_BASE_URL;
const apiKey = process.env.MODEL_API_KEY;
const model = process.env.MODEL_ID;

if (!baseUrl || !apiKey || !model) {
  throw new Error(
    "MODEL_BASE_URL、MODEL_API_KEY 與 MODEL_ID 都必須提供。",
  );
}

const client = new CopilotClient();

const session = await client.createSession({
  model,
  provider: {
    type: "openai",
    baseUrl,
    apiKey,
  },
  availableTools: [],
});

const response = await session.sendAndWait(
  {
    prompt:
      "請用三點說明 Agent 應用進入正式服務後，" +
      "需要處理哪些工程問題。",
  },
  120_000,
);

console.log(response?.data.content);

await session.disconnect();
await client.stop();
