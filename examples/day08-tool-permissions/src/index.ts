import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import {
  CopilotClient,
  type PermissionRequest,
  type PermissionRequestResult,
} from "@github/copilot-sdk";

async function handlePermissionRequest(
  request: PermissionRequest,
): Promise<PermissionRequestResult> {
  if (request.kind !== "shell") {
    return {
      kind: "reject",
      feedback: `這個範例只允許確認 Shell 操作，目前收到 ${request.kind}。`,
    };
  }

  if (request.requestSandboxBypass) {
    return {
      kind: "reject",
      feedback: "這個範例不允許繞過 Sandbox。",
    };
  }

  if (!input.isTTY || !output.isTTY) {
    return {
      kind: "user-not-available",
    };
  }

  // 讓 permission.requested 的事件訂閱者先完成畫面更新。
  await Promise.resolve();

  const readline = createInterface({ input, output });

  const lines = [
    "",
    "Agent 要求執行 Shell 指令。",
    `用途：${request.intention}`,
    `指令：${request.fullCommandText}`,
  ];

  if (request.warning) {
    lines.push(`警告：${request.warning}`);
  }

  lines.push("是否允許這一次操作？(y/N)：");

  const answer = await readline.question(lines.join("\n"));
  readline.close();

  if (["y", "yes"].includes(answer.trim().toLowerCase())) {
    return {
      kind: "approve-once",
    };
  }

  return {
    kind: "reject",
    feedback: "使用者拒絕這次 Shell 操作。",
  };
}

const client = new CopilotClient();

const session = await client.createSession({
  model: "auto",
  onPermissionRequest: handlePermissionRequest,
});

session.on("permission.requested", (event) => {
  console.log(
    `[permission:${event.data.requestId}] ` +
      `requested kind=${event.data.permissionRequest.kind}`,
  );
});

session.on("permission.completed", (event) => {
  console.log(
    `[permission:${event.data.requestId}] ` +
      `completed result=${event.data.result.kind}`,
  );
});

session.on("tool.execution_start", (event) => {
  console.log(
    `[tool:${event.data.toolCallId}] start name=${event.data.toolName}`,
  );
});

session.on("tool.execution_complete", (event) => {
  console.log(
    `[tool:${event.data.toolCallId}] complete success=${event.data.success}`,
  );
});

const response = await session.sendAndWait(
  {
    prompt:
      "請務必使用 Shell 工具執行 `pwd`，" +
      "再根據實際結果回答目前工作目錄；" +
      "不要使用其他方式推測。" +
      "如果操作被拒絕，請直接說明無法取得結果，" +
      "不要再次提出相同的工具請求。",
  },
  120_000,
);

console.log("\n模型回應：");
console.log(response?.data.content ?? "沒有收到 Assistant 訊息。");

await session.disconnect();
await client.stop();
