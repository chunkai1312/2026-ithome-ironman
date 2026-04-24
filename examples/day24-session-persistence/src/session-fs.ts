import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CopilotClient } from "@github/copilot-sdk";
import { createLocalSessionFsProvider } from "./local-session-fs-provider.js";

const SESSION_ID = "incident-review-session-fs";

const projectDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const appDataDirectory = path.join(projectDirectory, "app-data");
const sessionDirectory = path.join(appDataDirectory, SESSION_ID);
const sessionStateDirectory = path.join(
  sessionDirectory,
  "session-state",
);

await mkdir(sessionDirectory, { recursive: true });

const client = new CopilotClient({
  mode: "empty",
  sessionFs: {
    initialCwd: "/",
    sessionStatePath: "/session-state",
    conventions: "posix",
  },
});

const session = await client.createSession({
  sessionId: SESSION_ID,
  model: "auto",
  availableTools: [],
  infiniteSessions: {
    enabled: true,
  },
  createSessionFsProvider: (currentSession) =>
    createLocalSessionFsProvider(
      path.join(appDataDirectory, currentSession.sessionId),
    ),
});

console.log(`[session] created ${session.sessionId}`);

const response = await session.sendAndWait(
  {
    prompt:
      "請根據以下固定資訊整理目前 Incident 摘要：" +
      "服務為 checkout-api，環境為 staging，" +
      "目前狀態為 degraded，主要問題是 Payment gateway timeout。",
  },
  120_000,
);

console.log("\nIncident 摘要：");
console.log(response?.data.content);

await session.disconnect();
await client.stop();

const entries = await readdir(sessionStateDirectory);

console.log("\n應用程式保存的 Session 狀態：");
console.log(sessionStateDirectory);

for (const entry of entries) {
  console.log(`- ${entry}`);
}
