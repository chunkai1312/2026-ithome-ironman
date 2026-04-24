import { CopilotClient } from "@github/copilot-sdk";

const client = new CopilotClient();
await client.start();

const session = await client.createSession({
  model: "auto",
});

const response = await session.sendAndWait({
  prompt: "請用一句話介紹 GitHub Copilot SDK。",
});

console.log(response?.data.content);

await session.disconnect();
await client.stop();
