import path from "node:path";
import { fileURLToPath } from "node:url";
import { CopilotClient, defineTool } from "@github/copilot-sdk";
import { z } from "zod";

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillsDirectory = path.join(projectDirectory, "skills");

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

const client = new CopilotClient();

const session = await client.createSession({
  model: "auto",
  workingDirectory: projectDirectory,
  tools: [getReleaseStatus],
  skillDirectories: [skillsDirectory],
  defaultAgent: {
    excludedTools: ["get_release_status", "skill"],
  },
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
    {
      name: "release-reviewer",
      displayName: "Release Reviewer",
      description: "根據版本狀態評估目前版本是否適合部署到目標環境。",
      tools: [],
      skills: ["release-readiness-review"],
      prompt:
        "請根據被委派工作中提供的版本資料完成審查。" +
        "使用預載的版本發布準備度審查方法，" +
        "不要自行補充目前沒有提供的版本資訊。",
    },
  ],
});

session.on((event) => {
  switch (event.type) {
    case "subagent.selected":
      console.log(`[subagent] selected ${event.data.agentDisplayName}`);
      break;
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

console.log("\nReview result:");
console.log(response?.data.content);

await session.disconnect();
await client.stop();
