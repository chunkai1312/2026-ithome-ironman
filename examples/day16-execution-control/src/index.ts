import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import { CopilotClient, defineTool } from "@github/copilot-sdk";
import { z } from "zod";

const moduleRecords = {
  authentication: {
    summary: "Authentication uses access tokens and refresh tokens.",
    risks: [
      "Refresh token rotation is not implemented.",
      "Several authentication failures share the same error response.",
    ],
    tests: ["Login success", "Invalid password", "Expired access token"],
  },
  payment: {
    summary: "Payment requests are submitted through a synchronous service.",
    risks: [
      "Retry requests do not use an idempotency key.",
      "External gateway timeout handling is incomplete.",
    ],
    tests: ["Successful payment", "Gateway rejection"],
  },
  notification: {
    summary: "Notifications are dispatched through an asynchronous worker.",
    risks: [
      "Failed notifications use a fixed retry delay.",
      "Permanent failures are not separated from temporary failures.",
    ],
    tests: ["Email delivery", "Temporary provider failure"],
  },
} as const;

const inspectModule = defineTool("inspect_module", {
  description: "Return fixed analysis data for a sample application module",
  parameters: z.object({
    module: z.enum(["authentication", "payment", "notification"]),
  }),
  defer: "never",
  skipPermission: true,
  handler: async ({ module }) => ({
    module,
    ...moduleRecords[module],
  }),
});

const readline = createInterface({ input, output });
const client = new CopilotClient();

const session = await client.createSession({
  model: "auto",
  tools: [inspectModule],
  availableTools: ["custom:inspect_module"],
});

session.on("tool.execution_start", (event) => {
  console.log(`\n[tool:${event.data.toolCallId}] start ${event.data.toolName}`);
});

session.on("tool.execution_complete", (event) => {
  console.log(
    `\n[tool:${event.data.toolCallId}] complete success=${event.data.success}`,
  );
});

session.on("assistant.message", (event) => {
  const content = event.data.content.trim();

  if (content) {
    console.log(`\n[assistant]\n${content}`);
  }
});

session.on("abort", (event) => {
  console.log(`\n[abort] reason=${event.data.reason}`);
});

session.on("session.idle", (event) => {
  console.log(
    event.data.aborted ? "\n[session] idle aborted=true" : "\n[session] idle",
  );
});

session.on("session.error", (event) => {
  console.error(`\n[session:error] ${event.data.message}`);
});

console.log(`
可以輸入：

/start          開始分析
/steer <訊息>   修正目前工作方向
/queue <訊息>   安排後續工作
/abort          中止目前工作
/exit           結束範例程式
`);

while (true) {
  const command = (await readline.question("> ")).trim();

  if (!command) {
    continue;
  }

  if (command === "/exit") {
    break;
  }

  if (command === "/start") {
    const messageId = await session.send({
      prompt:
        "請分析 authentication、payment 與 notification 三個模組。" +
        "請務必使用 inspect_module 取得各模組的實際資料，" +
        "再整理目前最值得優先改善的三個問題與原因。",
    });

    console.log(`[message:${messageId}] submitted`);
    continue;
  }

  if (command === "/abort") {
    await session.abort();
    continue;
  }

  if (command.startsWith("/steer ")) {
    const prompt = command.slice("/steer ".length).trim();

    if (!prompt) {
      continue;
    }

    const steeringMessageId = await session.send({
      prompt,
      mode: "immediate",
    });

    console.log(`[steer:${steeringMessageId}] submitted`);
    continue;
  }

  if (command.startsWith("/queue ")) {
    const prompt = command.slice("/queue ".length).trim();

    if (!prompt) {
      continue;
    }

    const queuedMessageId = await session.send({
      prompt,
      mode: "enqueue",
    });

    console.log(`[queue:${queuedMessageId}] submitted`);
    continue;
  }

  console.log("請使用 /start、/steer、/queue、/abort 或 /exit。");
}

readline.close();
await session.disconnect();
await client.stop();
