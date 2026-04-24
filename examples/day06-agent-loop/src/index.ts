import path from "node:path";
import { fileURLToPath } from "node:url";
import { CopilotClient, approveAll } from "@github/copilot-sdk";

const projectDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

let turnCount = 0;
let toolExecutionCount = 0;

const client = new CopilotClient();

const session = await client.createSession({
  model: "auto",
  workingDirectory: projectDirectory,
  availableTools: ["view"],
  onPermissionRequest: approveAll,
});

session.on("assistant.turn_start", (event) => {
  turnCount += 1;
  console.log(`[turn:${event.data.turnId}] start`);
});

session.on("assistant.turn_end", (event) => {
  console.log(`[turn:${event.data.turnId}] end`);
});

session.on("tool.execution_start", (event) => {
  toolExecutionCount += 1;
  console.log(`[tool:${event.data.toolCallId}] start name=${event.data.toolName}`);
});

session.on("tool.execution_complete", (event) => {
  console.log(
    `[tool:${event.data.toolCallId}] complete success=${event.data.success}`,
  );
});

session.on("session.idle", () => {
  console.log("[session] idle");
});

const response = await session.sendAndWait(
  {
    prompt:
      "請務必使用 view 工具讀取 fixtures/project-info.txt，" +
      "再根據檔案實際內容整理 Project、Runtime、Database、" +
      "Cache 與 Deployment；不要根據既有知識推測檔案內容。",
  },
  120_000,
);

console.log(`\nTurn 數量：${turnCount}`);
console.log(`工具執行次數：${toolExecutionCount}`);
console.log("\n模型回應：");
console.log(response?.data.content);

await session.disconnect();
await client.stop();
