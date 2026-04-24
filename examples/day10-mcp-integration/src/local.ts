import path from "node:path";
import { fileURLToPath } from "node:url";
import { CopilotClient, approveAll } from "@github/copilot-sdk";

const fixtureDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../fixtures",
);

const client = new CopilotClient();

const session = await client.createSession({
  model: "auto",
  availableTools: ["mcp:*"],
  onPermissionRequest: approveAll,
  mcpServers: {
    filesystem: {
      type: "local",
      command: "npx",
      args: [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        fixtureDirectory,
      ],
      tools: ["list_directory", "read_text_file"],
      timeout: 30_000,
    },
  },
});

session.on("tool.execution_start", (event) => {
  console.log(
    `[mcp:${event.data.mcpServerName}] ` +
      `start ${event.data.mcpToolName}`,
  );
});

session.on("tool.execution_complete", (event) => {
  console.log(
    `[tool:${event.data.toolCallId}] ` +
      `complete success=${event.data.success}`,
  );
});

const response = await session.sendAndWait(
  {
    prompt:
      "請務必使用 filesystem MCP Server 的 list_directory 與 " +
      `read_text_file，先檢查 ${fixtureDirectory}，` +
      "再讀取 project-info.md，根據檔案實際內容整理 " +
      "Project、Runtime、Database、Cache 與 Deployment；" +
      "不要使用其他工具或既有知識推測。",
  },
  120_000,
);

console.log("\n模型回應：");
console.log(response?.data.content);

await session.disconnect();
await client.stop();
