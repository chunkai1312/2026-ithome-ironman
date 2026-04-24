import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CopilotClient,
  defineTool,
  RuntimeConnection,
} from "@github/copilot-sdk";
import { z } from "zod";

const projectDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const pluginDirectory = path.join(
  projectDirectory,
  "plugins",
  "release-readiness",
);

const releaseStatus = {
  release: "2026.08.21",
  targetEnvironment: "staging",
  automatedTests: { passed: 128, failed: 0 },
  migration: { required: true, status: "ready" },
  rollbackPlan: "available",
  knownRisk: "refresh token rotation 尚未啟用",
  riskDisposition: "staging 可以接受，production 前必須完成",
};

const getReleaseStatus = defineTool("get_release_status", {
  description: "取得目前版本發布準備度審查需要的固定版本狀態",
  parameters: z.object({}),
  defer: "never",
  skipPermission: true,
  handler: async () => releaseStatus,
});

const client = new CopilotClient({
  connection: RuntimeConnection.forStdio({
    args: ["--plugin-dir", pluginDirectory],
  }),
});

const session = await client.createSession({
  model: "auto",
  tools: [getReleaseStatus],
  defaultAgent: { excludedTools: ["get_release_status", "skill"] },
  customAgents: [
    {
      name: "release-researcher",
      displayName: "Release Researcher",
      description: "取得版本發布準備度審查需要的實際版本狀態。",
      tools: ["get_release_status"],
      prompt:
        "請使用 get_release_status 取得目前版本的實際狀態。" +
        "完整整理取得的資料，不要自行判斷 Ready、Needs Review 或 Blocked。",
    },
  ],
});

const plugins = await session.rpc.plugins.list();
const releasePlugin = plugins.plugins.find(
  (plugin) => plugin.name === "release-readiness",
);

if (!releasePlugin?.enabled) {
  throw new Error("release-readiness Plugin 未成功載入。");
}

const skills = await session.rpc.skills.list();
const reviewSkill = skills.skills.find(
  (skill) => skill.name === "release-readiness-review",
);

if (!reviewSkill?.enabled) {
  throw new Error("release-readiness-review Skill 未成功載入。");
}

console.log(`[plugin] ${releasePlugin.name} loaded`);

session.on((event) => {
  switch (event.type) {
    case "subagent.started":
      console.log(
        `[subagent:${event.data.toolCallId}] started ${event.data.agentDisplayName}`,
      );
      break;
    case "subagent.completed":
      console.log(
        `[subagent:${event.data.toolCallId}] completed ${event.data.agentDisplayName}`,
      );
      break;
    case "subagent.failed":
      console.error(
        `[subagent:${event.data.toolCallId}] failed ` +
          `${event.data.agentDisplayName}: ${event.data.error}`,
      );
      break;
    case "tool.execution_start":
      console.log(
        `[tool:${event.data.toolCallId}] start ${event.data.toolName} ` +
          `agent=${event.agentId ?? "main"}`,
      );
      break;
  }
});

const response = await session.sendAndWait(
  {
    prompt:
      "請完成這次版本發布準備度審查。" +
      "先委派 release-researcher 取得目前版本的實際資料，" +
      "再將取得的資料交給 release-reviewer 完成審查。" +
      "最後整理審查結果與主要理由。" +
      "請只根據這兩個角色取得與判斷的內容回答。",
  },
  120_000,
);

console.log("\n審查結果：");
console.log(response?.data.content);

await session.disconnect();
await client.stop();
