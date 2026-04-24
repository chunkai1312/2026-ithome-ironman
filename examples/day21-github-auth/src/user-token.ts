import { CopilotClient } from "@github/copilot-sdk";

const userAccessToken = process.env.USER_GITHUB_TOKEN;

if (!userAccessToken) {
  throw new Error("USER_GITHUB_TOKEN is required");
}

const client = new CopilotClient({
  gitHubToken: userAccessToken,
  useLoggedInUser: false,
});

const session = await client.createSession({
  model: "auto",
  availableTools: [],
});

const response = await session.sendAndWait(
  {
    prompt: "請用三點說明 GitHub Copilot SDK 適合整合進哪些應用程式。",
  },
  120_000,
);

console.log(response?.data.content);

await session.disconnect();
await client.stop();
