import { CopilotClient } from "@github/copilot-sdk";

const client = new CopilotClient({
  useLoggedInUser: false,
});

const session = await client.createSession({
  model: "auto",
  availableTools: [],
});

const response = await session.sendAndWait(
  {
    prompt: "請用三點整理在 CI/CD 中執行 Agent 工作需要注意的工程問題。",
  },
  120_000,
);

console.log(response?.data.content);

await session.disconnect();
await client.stop();
