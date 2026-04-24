import { CopilotClient, approveAll } from "@github/copilot-sdk";

const client = new CopilotClient();

const session = await client.createSession({
  model: "auto",
  availableTools: ["mcp:*"],
  onPermissionRequest: approveAll,
  mcpServers: {
    docs: {
      type: "http",
      url: "https://modelcontextprotocol.io/mcp",
      tools: ["search_model_context_protocol"],
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
      "請務必使用 docs MCP Server 的 search_model_context_protocol，" +
      "搜尋 MCP Tools capability，再根據工具取得的文件內容，" +
      "用三點整理 MCP Tool 的用途與基本運作方式；" +
      "不要使用其他工具或既有知識補充。",
  },
  120_000,
);

console.log("\n模型回應：");
console.log(response?.data.content);

await session.disconnect();
await client.stop();
