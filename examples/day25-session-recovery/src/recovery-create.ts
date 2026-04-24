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

const session = await client.createSession({
  sessionId: SESSION_ID,
  model: "auto",
  tools: [getIncidentStatus],
  availableTools: ["custom:get_incident_status"],
});

console.log(`[session] created ${session.sessionId}`);

const response = await session.sendAndWait(
  {
    prompt:
      "請務必使用 get_incident_status 取得目前 Incident 狀態，" +
      "整理服務狀態、錯誤率、目前未結事件數與緩解措施，" +
      "並說明後續最需要追蹤的指標。",
  },
  120_000,
);

console.log("\nIncident 分析：");
console.log(response?.data.content);

await session.disconnect();
await client.stop();
