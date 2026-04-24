import path from "node:path";
import { fileURLToPath } from "node:url";
import { CopilotClient, approveAll } from "@github/copilot-sdk";

const projectDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const client = new CopilotClient();

const session = await client.createSession({
  model: "auto",
  streaming: true,
  workingDirectory: projectDirectory,
  availableTools: ["view"],
  onPermissionRequest: approveAll,
});

const deltaCountByMessage = new Map<string, number>();

const unsubscribe = session.on((event) => {
  switch (event.type) {
    case "assistant.turn_start":
      console.log(`[turn:${event.data.turnId}] start`);
      break;

    case "assistant.message_delta": {
      const count = deltaCountByMessage.get(event.data.messageId) ?? 0;
      deltaCountByMessage.set(event.data.messageId, count + 1);
      break;
    }

    case "assistant.message": {
      const { messageId, toolRequests = [] } = event.data;
      const deltaCount = deltaCountByMessage.get(messageId) ?? 0;

      console.log(
        `[message:${messageId}] complete ` +
          `deltas=${deltaCount} toolRequests=${toolRequests.length}`,
      );

      for (const request of toolRequests) {
        console.log(
          `[tool:${request.toolCallId}] requested name=${request.name}`,
        );
      }
      break;
    }

    case "tool.execution_start":
      console.log(
        `[tool:${event.data.toolCallId}] start name=${event.data.toolName}`,
      );
      break;

    case "tool.execution_complete":
      console.log(
        `[tool:${event.data.toolCallId}] complete success=${event.data.success}`,
      );
      break;

    case "assistant.turn_end":
      console.log(`[turn:${event.data.turnId}] end`);
      break;

    case "session.error":
      console.error(
        `[session:error] ${event.data.errorType}: ${event.data.message}`,
      );
      break;

    case "session.idle":
      console.log("[session] idle");
      break;
  }
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

console.log("\n模型回應：");
console.log(response?.data.content);

unsubscribe();
await session.disconnect();
await client.stop();
