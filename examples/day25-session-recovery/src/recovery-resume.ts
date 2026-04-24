import path from "node:path";
import { fileURLToPath } from "node:url";
import { CopilotClient } from "@github/copilot-sdk";
import { getIncidentStatus } from "./recovery-tools.js";

const SESSION_ID = "incident-review-recovery";

const projectDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const runtimeDirectory = path.join(
  projectDirectory,
  "runtime-data",
);

const client = new CopilotClient({
  mode: "empty",
  baseDirectory: runtimeDirectory,
});

const session = await client.resumeSession(
  SESSION_ID,
  {
    tools: [getIncidentStatus],
    availableTools: ["custom:get_incident_status"],
  },
);

console.log(`[session] resumed ${session.sessionId}`);

const response = await session.sendAndWait(
  {
    prompt:
      "延續前面的 Incident 分析。" +
      "請再次使用 get_incident_status 取得目前狀態，" +
      "比較它和上一輪取得的資料，並說明狀態是否有變化。",
  },
  120_000,
);

console.log("\n更新後分析：");
console.log(response?.data.content);

await session.disconnect();
await client.stop();
