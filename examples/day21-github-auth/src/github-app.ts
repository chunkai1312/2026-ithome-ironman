import { CopilotClient } from "@github/copilot-sdk";

const installationToken = process.env.INSTALLATION_TOKEN;

if (!installationToken) {
  throw new Error("INSTALLATION_TOKEN is required");
}

const client = new CopilotClient({
  env: {
    ...process.env,
    COPILOT_GITHUB_TOKEN: installationToken,
  },
  useLoggedInUser: false,
});

const session = await client.createSession({
  model: "auto",
  availableTools: [],
});

const response = await session.sendAndWait(
  {
    prompt: "請用三點整理自動化 Agent 工作需要注意的執行條件。",
  },
  120_000,
);

console.log(response?.data.content);

await session.disconnect();
await client.stop();
