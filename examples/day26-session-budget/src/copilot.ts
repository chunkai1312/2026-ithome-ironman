import { CopilotClient } from "@github/copilot-sdk";

const MAX_AI_CREDITS = 30;

const client = new CopilotClient();

const session = await client.createSession({
  model: "auto",
  streaming: true,
  availableTools: [],
  sessionLimits: {
    maxAiCredits: MAX_AI_CREDITS,
  },
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

session.on("session_limits_exhausted.requested", (event) => {
  console.log(
    `[budget] exhausted used=${event.data.usedAiCredits} ` +
      `max=${event.data.maxAiCredits}`,
  );

  void session.rpc.ui.handlePendingSessionLimitsExhausted({
    requestId: event.data.requestId,
    response: {
      action: "cancel",
    },
  });
});

session.on("session_limits_exhausted.completed", (event) => {
  console.log(`[budget] completed action=${event.data.response.action}`);
});

const prompts = [
  "請用三點整理長時間 Agent 工作需要注意的模型資源使用問題。",
  "延續前面的內容，再整理成後端服務可以使用的檢查清單。",
];

for (const prompt of prompts) {
  const response = await session.sendAndWait({ prompt }, 120_000);

  console.log("\n模型回應：");
  console.log(response?.data.content);

  const metrics = await session.rpc.usage.getMetrics();
  const aiCredits = (metrics.totalNanoAiu ?? 0) / 1e9;

  console.log(`[session] aiCredits=${aiCredits.toFixed(6)}`);
}

await session.disconnect();
await client.stop();
